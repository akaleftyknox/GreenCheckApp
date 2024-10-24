// index.tsx

import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/utils/supabase'; // Import Supabase client

import Button from '@/components/Button';
import ImageViewer from '@/components/ImageViewer';
import IconButton from '@/components/IconButton';
import IngredientResults from '@/components/IngredientResults';
import IngredientList from '@/components/IngredientList';

import { getMimeType } from '@/utils/getMimeType'; // Import the MIME type utility

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
  const [isLoading, setIsLoading] = useState<boolean>(false); // Added loading state

  const pickImageAsync = async () => {
    try {
      console.log('Requesting media library permissions...');
      setIsLoading(true); // Start loading

      // Request permission to access media library
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert("Permission to access camera roll is required!");
        console.log('Permission denied.');
        setIsLoading(false); // End loading
        return;
      }

      console.log('Launching image library...');
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const image = result.assets[0];
        const localUri = image.uri;
        console.log('Selected Image URI:', localUri);
        setSelectedImage(localUri);

        try {
          // Upload image to Supabase Storage
          const fileName = image.fileName || `uploaded_image_${Date.now()}.jpg`;
          console.log('Preparing to upload:', fileName);
          const uploadedUrl = await uploadImageToSupabase(localUri, fileName, image);
          setImageUrl(uploadedUrl);

          console.log('Image uploaded to Supabase. URL:', uploadedUrl);

          // Call the serverless function to check for ingredients
          const fetchedIngredients = await checkIngredients(uploadedUrl);

          if (fetchedIngredients) {
            setIngredients(fetchedIngredients);
            setIsModalVisible(true); // Open modal with real data
          }

        } catch (error: any) {
          console.error('Error uploading image:', error);
          Alert.alert('Error uploading image', error.message || 'Please try again.');
        }

      } else {
        Alert.alert('No Image Selected', 'You did not select any image.');
        console.log('Image selection canceled.');
      }
    } catch (error: any) {
      console.error('Unexpected error in pickImageAsync:', error);
      Alert.alert('Unexpected Error', error.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false); // End loading
    }
  };

  const uploadImageToSupabase = async (uri: string, fileName: string, image: any): Promise<string> => {
    try {
      console.log('Fetching image from URI...');
      // Convert URI to ArrayBuffer
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

      // Define the path in Supabase Storage
      // Remove 'images/' prefix to avoid nested paths
      const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpeg';
      const path = `${Date.now()}.${fileExt}`;
      console.log('Upload Path:', path);

      // Determine content type with fallback using the MIME type utility
      const contentType = getMimeType(fileName);
      console.log('Content Type:', contentType);

      // Upload the image with contentType
      console.log('Uploading to Supabase...');
      const { data, error: uploadError } = await supabase.storage.from('images').upload(path, arrayBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: contentType, // Explicitly set the content type
      });

      if (uploadError) {
        console.error('Upload Error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('Upload Data:', data);

      // Retrieve public URL
      console.log('Retrieving public URL...');
      const { data: publicURLData, error: urlError } = supabase
        .storage
        .from('images')
        .getPublicUrl(path);

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
      throw error; // Re-throw the error to be caught in the caller
    }
  };

  const checkIngredients = async (imageUrl: string): Promise<Ingredient[] | null> => {
    try {
      // First API call to process the image
      const processResponse = await fetch('/api/processImage', { // Use relative path
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }),
      });

      const processData = await processResponse.json();

      if (!processResponse.ok) {
        throw new Error(processData.error || 'Error processing image');
      }

      console.log('Extracted text:', processData.description);

      // Second API call to analyze ingredients
      const analyzeResponse = await fetch('/api/analyzeIngredients', { // Use relative path
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ extractedText: processData.description }),
      });

      const analyzeData = await analyzeResponse.json();

      if (!analyzeResponse.ok) {
        throw new Error(analyzeData.error || 'Error analyzing ingredients');
      }

      console.log('Analysis result:', analyzeData.analysis.ingredients);
      return analyzeData.analysis.ingredients; // Return the array of ingredients

    } catch (error: any) {
      console.error('Error in ingredient analysis chain:', error);
      Alert.alert('Error', error.message || 'An error occurred while analyzing the ingredients.');
      return null;
    }
  };

  const onReset = () => {
    setSelectedImage(undefined);
    setImageUrl(undefined);
    setIngredients([]);
    setIsModalVisible(false); // Close modal
    console.log('App state has been reset.');
  };

  const onModalClose = () => {
    onReset(); // Reset state when modal is closed
    console.log('Modal has been closed and app state reset.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <ImageViewer imgSource={PlaceholderImage} selectedImage={selectedImage} />
        {selectedImage && (
          <IngredientList ingredients={ingredients} onCloseModal={onModalClose} />
        )}
      </View>
      {selectedImage && ingredients.length > 0 && (
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
      <IngredientResults isVisible={isModalVisible} onClose={onModalClose}>
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#ff6a55" />
          </View>
        ) : (
          <IngredientList ingredients={ingredients} onCloseModal={onModalClose} />
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});