// app/index.tsx

import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import Button from '@/components/Button';
import ImageViewer from '@/components/ImageViewer';
import IconButton from '@/components/IconButton';
import { getMimeType } from '@/utils/getMimeType';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { createScan } from '@/utils/db';
import { getGradeInfo } from '@/utils/gradeUtils';

const PlaceholderImage = require('@/assets/images/background-image.png');

type Ingredient = {
  id: string;
  title: string;
  toxicityRating: number;
  description: string;
};

export default function Index() {
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  const openCamera = () => {
    router.push('/camera');
  };

  const pickImageAsync = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert('Permission to access camera roll is required!');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const image = result.assets[0];
        const localUri = image.uri;
        setSelectedImage(localUri);

        try {
          setIsLoading(true);

          const fileName = image.fileName || `uploaded_image_${Date.now()}.jpg`;
          const uploadedUrl = await uploadImageToSupabase(localUri, fileName);

          const analysisResult = await checkIngredients(uploadedUrl);
          const ingredients = analysisResult.ingredients;

          const overallScore = calculateOverallScore(ingredients);

          // Get grade information
          const { grade, ratingDescription } = getGradeInfo(overallScore || 0);

          // Get current user (null if not authenticated)
          const { data: { user } } = await supabase.auth.getUser();

          // Save scan to database
          const { error: dbError } = await createScan(user?.id, {
            overall_grade: overallScore || 0,
            overall_grade_description: ratingDescription,
            image_url: uploadedUrl,
            scan_title: null, // Will be implemented later
            ingredients: ingredients.map((ing: any) => ({
              title: ing.title,
              toxicity_rating: ing.toxicityRating,
              description: ing.description,
            })),
          });

          if (dbError) {
            console.error('Error saving scan to database:', dbError);
            Alert.alert('Error', 'An error occurred while saving the scan data.');
          }

          setIsLoading(false);

          router.push({
            pathname: '/ScanResults',
            params: {
              imageUrl: uploadedUrl,
              ingredients: JSON.stringify(ingredients),
              overallScore: overallScore ? overallScore.toString() : '0',
            },
          });
        } catch (error: any) {
          console.error('Error processing image and analyzing ingredients:', error);
          Alert.alert('Error', error.message || 'An error occurred while analyzing the ingredients.');
          setIsLoading(false);
        }
      } else {
        Alert.alert('No Image Selected', 'You did not select any image.');
      }
    } catch (error: any) {
      console.error('Unexpected error in pickImageAsync:', error);
      Alert.alert('Unexpected Error', error.message || 'An unexpected error occurred.');
    }
  };

  const calculateOverallScore = (analyzedIngredients: Ingredient[]) => {
    const toxicityScores = analyzedIngredients
      .map((ingredient: Ingredient) => ingredient.toxicityRating)
      .filter((score) => score > 0);
  
    if (toxicityScores.length === 0) {
      return null;
    }
  
    // Calculate the average toxicity score
    const totalScore = toxicityScores.reduce((sum, score) => sum + score, 0);
    const averageScore = totalScore / toxicityScores.length;
  
    return averageScore;
  };

  const uploadImageToSupabase = async (uri: string, fileName: string): Promise<string> => {
    try {
      const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${Date.now()}.${fileExt}`;

      const contentType = getMimeType(fileName);

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const buffer = Buffer.from(base64, 'base64');

      const { data, error: uploadError } = await supabase.storage
        .from('images')
        .upload(path, buffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: contentType,
        });

      if (uploadError) {
        console.error('Upload Error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: publicURLData } = supabase.storage.from('images').getPublicUrl(path);

      if (!publicURLData || !publicURLData.publicUrl) {
        throw new Error('Unable to retrieve public URL');
      }

      return publicURLData.publicUrl;
    } catch (error: any) {
      console.error('uploadImageToSupabase Error:', error);
      throw error;
    }
  };

  const checkIngredients = async (imageUrl: string) => {
    try {
      const processResponse = await fetch('https://green-check.vercel.app/api/processImage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }),
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.error || 'Error processing image');
      }

      const processData = await processResponse.json();

      const analyzeResponse = await fetch('https://green-check.vercel.app/api/analyzeIngredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ extractedText: processData.description }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        throw new Error(errorData.error || 'Error analyzing ingredients');
      }

      const analyzeData = await analyzeResponse.json();
      return analyzeData.analysis;
    } catch (error: any) {
      console.error('Error in ingredient analysis chain:', error);
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <ImageViewer imgSource={PlaceholderImage} selectedImage={selectedImage} />
      </View>
      {selectedImage && (
        <View style={styles.optionsContainer}>
          <View style={styles.optionsRow}>
            <IconButton icon="refresh" label="Reset" onPress={() => setSelectedImage(undefined)} />
          </View>
        </View>
      )}
      {!selectedImage && (
        <View style={styles.footerContainer}>
          <View style={styles.buttonRow}>
            <Button theme="primary" label="Choose a photo" onPress={pickImageAsync} />
            <Button theme="primary" label="Take a photo" onPress={openCamera} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    paddingTop: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  optionsContainer: {
    position: 'absolute',
    bottom: 80,
  },
  optionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 20,
  },
  buttonRow: {
    flexDirection: 'column',
    gap: 16,
    alignItems: 'center',
  },
});