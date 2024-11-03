// hooks/useImagePicker.ts
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { imageAnalysisService } from '@/utils/imageAnalysisService';

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
        
        const analysis = await imageAnalysisService.analyzeImage(image.uri, fileName);
        
        router.push({
          pathname: '/ScanResults',
          params: {
            imageUrl: analysis.imageUrl,
            ingredients: JSON.stringify(analysis.ingredients),
            overallScore: analysis.overallScore.toString(),
          },
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred while processing the image.');
    } finally {
      setIsLoading(false);
    }
  };

  return { pickImage, isLoading };
};