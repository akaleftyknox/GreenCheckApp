// utils/imageAnalysisService.ts
import * as FileSystem from 'expo-file-system';
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

export const imageAnalysisService = {
  async uploadImageToSupabase(uri: string, fileName: string): Promise<string> {
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${Date.now()}.${fileExt}`;
    const contentType = getMimeType(fileName);
    
    const base64 = await FileSystem.readAsStringAsync(uri, {
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

  calculateOverallScore(ingredients: Ingredient[]): number {
    if (ingredients.length === 0) return 0;  // Check if there are any ingredients to avoid division by zero
    
    const toxicityScores = ingredients.map(ingredient => ingredient.toxicityRating);
    const totalScore = toxicityScores.reduce((sum, score) => sum + score, 0);
    return totalScore / toxicityScores.length;
  },

  async analyzeImage(imageUri: string, fileName: string): Promise<ProcessedAnalysis> {
    const uploadedUrl = await this.uploadImageToSupabase(imageUri, fileName);
    const analysisResult = await this.checkIngredients(uploadedUrl);
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
  }
};