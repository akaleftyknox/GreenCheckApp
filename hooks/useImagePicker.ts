// hooks/useImagePicker.ts
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

export const useImagePicker = () => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setIsLoading(true);
        const image = result.assets[0];
        const fileName = image.fileName || `uploaded_image_${Date.now()}.jpg`;
        
        router.push({
          pathname: '/LoadingResultsInterstitial',
          params: {
            imageUri: image.uri,
            fileName
          },
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred while selecting the image.');
    } finally {
      setIsLoading(false);
    }
  };

  return { pickImage, isLoading };
};