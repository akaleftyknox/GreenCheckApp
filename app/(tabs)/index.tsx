// app/(tabs)/index.tsx

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
    const n = toxicityScores.length;
    if (n === 0) {
      return null;
    }
    const sumOfReciprocals = toxicityScores.reduce((sum, score) => sum + 1 / score, 0);
    const harmonicMean = n / sumOfReciprocals;
    return harmonicMean;
  };

  const uploadImageToSupabase = async (uri: string, fileName: string): Promise<string> => {
    try {
      const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${Date.now()}.${fileExt}`;

      const contentType = getMimeType(fileName);

      // Read the file into a binary format
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
          <Button theme="primary" label="Choose a photo" onPress={pickImageAsync} />
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
});