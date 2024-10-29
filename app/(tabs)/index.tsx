// index.tsx

import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { supabase } from '@/utils/supabase';

import Button from '@/components/Button';
import ImageViewer from '@/components/ImageViewer';
import IconButton from '@/components/IconButton';
import IngredientResults from '@/components/IngredientResults';
import IngredientList from '@/components/IngredientList';

import { getMimeType } from '@/utils/getMimeType';

const PlaceholderImage = require('@/assets/images/background-image.png');

type Ingredient = {
  id: string;
  title: string;
  toxicityRating: number;
  description: string;
};

export default function Index() {
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [overallScore, setOverallScore] = useState<number | null>(null);

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
          setIsModalVisible(true);
          setIsLoading(true);

          const fileName = image.fileName || `uploaded_image_${Date.now()}.jpg`;
          const uploadedUrl = await uploadImageToSupabase(localUri, fileName, image);
          setImageUrl(uploadedUrl);

          const analysisResult = await checkIngredients(uploadedUrl);
          setIngredients(analysisResult.ingredients);
          setIsLoading(false);

          fetchOverallScore(analysisResult.ingredients);
        } catch (error: any) {
          console.error('Error processing image and analyzing ingredients:', error);
          Alert.alert('Error', error.message || 'An error occurred while analyzing the ingredients.');
          setIsLoading(false);
          setIsModalVisible(false);
        }
      } else {
        Alert.alert('No Image Selected', 'You did not select any image.');
      }
    } catch (error: any) {
      console.error('Unexpected error in pickImageAsync:', error);
      Alert.alert('Unexpected Error', error.message || 'An unexpected error occurred.');
    }
  };

  const fetchOverallScore = async (analyzedIngredients: Ingredient[]) => {
    try {
      const response = await fetch('https://green-check.vercel.app/api/overallToxicityScore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyzedIngredients }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error calculating overall toxicity score');
      }

      const data = await response.json();
      setOverallScore(data.overallScore);
    } catch (error: any) {
      console.error('Error fetching overall toxicity score:', error);
    }
  };

  const uploadImageToSupabase = async (uri: string, fileName: string, image: any): Promise<string> => {
    try {
      console.log('Fetching image from URI...');
      const response = await fetch(uri);

      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error('Failed to fetch the image from the URI.');
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log('ArrayBuffer Length:', arrayBuffer.byteLength);

      if (arrayBuffer.byteLength === 0) {
        throw new Error('ArrayBuffer is empty. No content to upload.');
      }

      const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpeg';
      const path = `${Date.now()}.${fileExt}`;
      console.log('Upload Path:', path);

      const contentType = getMimeType(fileName);
      console.log('Content Type:', contentType);

      console.log('Uploading to Supabase...');
      const { data, error: uploadError } = await supabase.storage.from('images').upload(path, arrayBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: contentType,
      });

      if (uploadError) {
        console.error('Upload Error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('Upload Data:', data);

      console.log('Retrieving public URL...');
      const { data: publicURLData, error: urlError } = supabase.storage.from('images').getPublicUrl(path);

      if (urlError) {
        console.error('URL Retrieval Error:', urlError);
        throw new Error(`Failed to retrieve public URL: ${urlError.message}`);
      }

      if (!publicURLData || !publicURLData.publicUrl) {
        throw new Error('Unable to retrieve public URL');
      }

      console.log('Public URL:', publicURLData.publicUrl);
      return publicURLData.publicUrl;
    } catch (error: any) {
      console.error('uploadImageToSupabase Error:', error);
      throw error;
    }
  };

  const checkIngredients = async (imageUrl: string) => {
    try {
      console.log('Starting process image request...');
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
      console.log('Process image response:', processData);

      console.log('Starting analyze ingredients request...');
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
      console.log('Analysis result:', analyzeData.analysis);
      return analyzeData.analysis;
    } catch (error: any) {
      console.error('Error in ingredient analysis chain:', error);
      throw error;
    }
  };

  const onReset = () => {
    setSelectedImage(undefined);
    setImageUrl(undefined);
    setIngredients([]);
    setIsModalVisible(false);
    setIsLoading(false);
    console.log('App state has been reset.');
  };

  const onModalClose = () => {
    onReset();
    console.log('Modal has been closed and app state reset.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <ImageViewer imgSource={PlaceholderImage} selectedImage={selectedImage} />
      </View>
      {selectedImage && (
        <View style={styles.optionsContainer}>
          <View style={styles.optionsRow}>
            <IconButton icon="refresh" label="Reset" onPress={onReset} />
          </View>
        </View>
      )}
      {!selectedImage && (
        <View style={styles.footerContainer}>
          <Button theme="primary" label="Choose a photo" onPress={pickImageAsync} />
        </View>
      )}
      <IngredientResults isVisible={isModalVisible} onClose={onModalClose} isLoading={isLoading}>
        {!isLoading && ingredients.length > 0 && (
          <IngredientList ingredients={ingredients} overallScore={overallScore} onCloseModal={onModalClose} />
        )}
      </IngredientResults>
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