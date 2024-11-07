// utils/imageAnalysisService.ts
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Buffer } from 'buffer';
import { supabase } from './supabase';
import { getMimeType } from './getMimeType';
import { getGradeInfo } from './gradeUtils';
import { createScan } from './db';

export interface Ingredient {
  id: string;
  title: string;
  toxicityRating: number;
  description: string;
}

export interface AnalysisResult {
  scanTitle: string | null;
  ingredients: {
    id: string;
    title: string;
    toxicityRating: number;
    description: string;
  }[];
}

export interface ProcessedAnalysis {
  imageUrl: string;
  scanTitle: string | null;
  ingredients: Ingredient[];
  overallScore: number;
  grade: string;
  ratingDescription: string;
}

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

interface AnalysisProgressCallback {
    onStepChange?: (step: number) => void;
  }

export const imageAnalysisService = {
    async compressImage(uri: string, options: CompressionOptions = {}): Promise<string> {
        const { 
          maxWidth = 1200, 
          maxHeight = 1200, 
          quality = 0.5 
        } = options;
      
        try {
          const manipulateResult = await ImageManipulator.manipulateAsync(
            uri,
            [
              {
                resize: {
                  width: maxWidth
                  // Removed height to maintain aspect ratio
                }
              }
            ],
            {
              compress: quality,
              format: ImageManipulator.SaveFormat.JPEG
            }
          );
      
          return manipulateResult.uri;
        } catch (error) {
          console.warn('Image compression failed, using original image:', error);
          return uri;
        }
      },

  async uploadImageToSupabase(uri: string, fileName: string): Promise<string> {
    // First compress the image
    const compressedUri = await this.compressImage(uri);
    
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${Date.now()}.${fileExt}`;
    const contentType = getMimeType(fileName);
    
    const base64 = await FileSystem.readAsStringAsync(compressedUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    const buffer = Buffer.from(base64, 'base64');
    
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(path, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType,
      });
      
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
    
    const { data: publicURLData } = supabase.storage.from('images').getPublicUrl(path);
    if (!publicURLData?.publicUrl) throw new Error('Unable to retrieve public URL');
    
    return publicURLData.publicUrl;
  },

  async checkIngredients(imageUrl: string) {
    const processResponse = await fetch('https://green-check.vercel.app/api/processImage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });

    if (!processResponse.ok) {
      const errorData = await processResponse.json();
      throw new Error(errorData.error || 'Error processing image');
    }

    const processData = await processResponse.json();

    const analyzeResponse = await fetch('https://green-check.vercel.app/api/analyzeIngredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extractedText: processData.description }),
    });

    if (!analyzeResponse.ok) {
      const errorData = await analyzeResponse.json();
      throw new Error(errorData.error || 'Error analyzing ingredients');
    }

    const analyzeData = await analyzeResponse.json();
    return analyzeData.analysis;
  },

  calculateOverallScore(ingredients: Array<{toxicityRating: number | string}>): number {
    if (ingredients.length === 0) return 1;
  
    // Single pass through ingredients to collect all metrics
    const metrics = ingredients.reduce((acc, ing) => {
      const rating = Math.max(1, Number(ing.toxicityRating));
      
      // Count high/moderate toxicity items
      if (rating >= 7) acc.highToxicityCount++;
      else if (rating >= 4) acc.moderateToxicityCount++;
      
      // Accumulate toxicity sum
      acc.toxicitySum += rating;
      
      // Calculate and store weight using original logic
      let weight;
      if (rating >= 7) {
        weight = Math.pow(1.2, rating - 1);  // From 1.4 to 1.3
      } else if (rating >= 4) {
        weight = Math.pow(1.10, rating - 1); // From 1.2 to 1.15
      } else {
        weight = Math.pow(1.02, rating - 1); // From 1.1 to 1.05
      }
      
      acc.totalScore += rating * weight;
      acc.maxPossibleScore += 10 * weight;
      
      return acc;
    }, {
      highToxicityCount: 0,
      moderateToxicityCount: 0,
      toxicitySum: 0,
      totalScore: 0,
      maxPossibleScore: 0
    });
  
    const count = ingredients.length;
    
    // Use original formulas exactly
    const countFactor = count <= 7 ? 1 : 
      Math.min(1.5, 1 + ((count - 7) * 0.04)); // From 0.08 to 0.06, cap from 2.0 to 1.75

      
    const cumulativePenalty = 
      Math.pow(1.10, metrics.highToxicityCount) * // From 1.2 to 1.15
      Math.pow(1.02, metrics.moderateToxicityCount); // From 1.05 to 1.03
    
      
    const averageToxicity = metrics.toxicitySum / count;
    const synergyCurve = Math.max(0, (averageToxicity - 3.5) / 7); // Raised threshold from 3 to 3.5
    const synergyPenalty = count <= 7 ? 1 :
      1 + (synergyCurve * (count - 7) / 250); // From 200 to 250
  
    let normalizedScore = (metrics.totalScore / metrics.maxPossibleScore) * 10;
    normalizedScore *= countFactor * cumulativePenalty * synergyPenalty;
    
    const finalScore = Math.min(10, Math.max(1, normalizedScore));
    return Number((1 + (8.5 * (Math.log(finalScore) / Math.log(10)))).toFixed(2));
  },

  async analyzeImage(
    imageUri: string, 
    fileName: string,
    callbacks?: AnalysisProgressCallback
  ): Promise<ProcessedAnalysis> {
    try {
      // Step 1: Upload
      callbacks?.onStepChange?.(1);
      const uploadedUrl = await this.uploadImageToSupabase(imageUri, fileName);
      
      // Step 2: Analyze
      callbacks?.onStepChange?.(2);
      const analysisResult = await this.checkIngredients(uploadedUrl);
      
      // Step 3: Process and Save
      callbacks?.onStepChange?.(3);
      const ingredients = analysisResult.ingredients;
      const overallScore = this.calculateOverallScore(ingredients);
      const { grade, ratingDescription } = getGradeInfo(overallScore);

      const { data: { user } } = await supabase.auth.getUser();
      
      await createScan(user?.id, {
        overall_grade: overallScore,
        overall_grade_description: ratingDescription,
        image_url: uploadedUrl,
        scan_title: analysisResult.scanTitle,
        ingredients: ingredients.map((ing: any) => ({
          title: ing.title,
          toxicity_rating: ing.toxicityRating,
          description: ing.description,
        })),
      });

      return {
        imageUrl: uploadedUrl,
        scanTitle: analysisResult.scanTitle,
        ingredients,
        overallScore,
        grade,
        ratingDescription,
      };
    } catch (error) {
      console.error('Analysis failed:', error);
      throw error;
    }
  }
};