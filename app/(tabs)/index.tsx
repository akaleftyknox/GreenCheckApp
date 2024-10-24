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

  // Function to pick an image
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
        const uri = result.assets[0].uri;
        console.log('Image selected:', uri);
        setSelectedImage(uri);

        // Upload image to Supabase
        const fileName = uri.split('/').pop() || 'image.jpg';
        const uploadedUrl = await uploadImageToSupabase(uri, fileName, result.assets[0]);

        if (uploadedUrl) {
          setImageUrl(uploadedUrl);
          console.log('Image uploaded to Supabase:', uploadedUrl);

          // Send URL to API to process image and analyze ingredients
          await checkIngredients(uploadedUrl);
        } else {
          console.log('Failed to upload image.');
          Alert.alert('Upload Failed', 'Failed to upload image to storage.');
          setIsLoading(false); // End loading
        }
      } else {
        Alert.alert('No Image Selected', 'You did not select any image.');
        console.log('Image selection canceled.');
        setIsLoading(false); // End loading
      }
    } catch (error: any) {
      console.error('Unexpected error in pickImageAsync:', error);
      Alert.alert('Unexpected Error', error.message || 'An unexpected error occurred.');
      setIsLoading(false); // End loading
    }
  };

  // Function to upload image to Supabase
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

  // Function to check ingredients using API endpoints
  const checkIngredients = async (imageUrl: string) => {
    try {
      setIsLoading(true); // Start loading
      // First API call to process the image
      const processResponse = await fetch('https://green-check.vercel.app/api/processImage', {
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
    
      // Second API call to analyze ingredients with longer timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180000); // 3 minute timeout
    
      try {
        const analyzeResponse = await fetch('https://green-check.vercel.app/api/analyzeIngredients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ extractedText: processData.description }),
          signal: controller.signal
        });
    
        clearTimeout(timeout);
    
        if (!analyzeResponse.ok) {
          const analyzeData = await analyzeResponse.json();
          throw new Error(analyzeData.error || 'Error analyzing ingredients');
        }
    
        const analyzeData = await analyzeResponse.json();
        console.log('Analysis result:', analyzeData.analysis);
        setIngredients(analyzeData.analysis.ingredients); // Set the fetched ingredients
        setIsModalVisible(true); // Open the modal
        setIsLoading(false); // End loading
    
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new Error('Analysis request timed out. Please try again.');
        }
        throw error;
      }
    
    } catch (error: any) {
      console.error('Error in ingredient analysis chain:', error);
      Alert.alert('Error', error.message || 'An error occurred while analyzing the ingredients.');
      setIsLoading(false); // End loading
    }
  };

  // Function to reset the state
  const onReset = () => {
    setSelectedImage(undefined);
    setImageUrl(undefined);
    setIngredients([]);
    setIsModalVisible(false); // Close modal
    console.log('App state has been reset.');
  };

  // Function to handle modal close
  const onModalClose = () => {
    onReset(); // Reset state when modal is closed
    console.log('Modal has been closed and app state reset.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <ImageViewer imgSource={PlaceholderImage} selectedImage={selectedImage} />
      </View>
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