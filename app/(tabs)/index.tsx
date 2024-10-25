// index.tsx

import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text } from 'react-native';
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

  // Define the backend API base URL
  const API_BASE_URL = 'https://green-check.vercel.app/api'; // Ensure this matches your deployed API

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
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        console.log('Image selected:', asset.uri);

        // Upload image to Supabase
        const { data, error } = await supabase.storage
          .from('images')
          .upload(`public/${Date.now()}_${asset.fileName}`, asset.uri, {
            contentType: getMimeType(asset.uri),
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Image upload error:', error);
          Alert.alert('Upload Failed', 'Failed to upload image.');
          setIsLoading(false); // End loading
          return;
        }

        // Get the public URL from Supabase
        const publicUrl = supabase.storage.from('images').getPublicUrl(data.path).publicURL;
        setImageUrl(publicUrl);
        console.log('Image uploaded to Supabase:', publicUrl);

        // Send URL to API to process image and analyze ingredients
        await checkIngredients(publicUrl);
      } else {
        console.log('Image selection canceled.');
      }

      setIsLoading(false); // End loading
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'An error occurred while picking the image.');
      setIsLoading(false); // End loading
    }
  };

  // Function to check ingredients by calling processImage and analyzeIngredients APIs
  const checkIngredients = async (uploadedUrl: string) => {
    try {
      console.log('Sending image URL to processImage API...');
      const processResponse = await fetch(`${API_BASE_URL}/processImage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: uploadedUrl }),
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        console.error('processImage API error:', errorData);
        throw new Error(errorData.error || 'Error processing image');
      }

      const processData = await processResponse.json();
      console.log('Extracted description:', processData.description);

      // Send extracted description to analyzeIngredients API
      console.log('Sending extracted text to analyzeIngredients API...');
      const analyzeResponse = await fetch(`${API_BASE_URL}/analyzeIngredients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ extractedText: processData.description }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json();
        console.error('analyzeIngredients API error:', errorData);
        throw new Error(errorData.error || 'Error analyzing ingredients');
      }

      const analyzeData = await analyzeResponse.json();
      console.log('Analysis result:', analyzeData.analysis.ingredients);

      setIngredients(analyzeData.analysis.ingredients); // Set the fetched ingredients
      setIsModalVisible(true); // Open the modal
    } catch (error: any) {
      console.error('Error in ingredient analysis chain:', error);
      Alert.alert('Error', error.message || 'An error occurred while analyzing the ingredients.');
      setIsLoading(false); // End loading
    }
  };

  // Function to close the modal
  const onModalClose = () => {
    setIsModalVisible(false);
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
