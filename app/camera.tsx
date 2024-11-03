// app/camera.tsx
import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAutofocus } from '@/hooks/useAutofocus';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { imageAnalysisService } from '@/utils/imageAnalysisService';

export default function CameraScreen() {
  const cameraRef = useRef<CameraView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const { isRefreshing, focusSquare, onTap } = useAutofocus();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleCameraReady = () => {
    setIsCameraReady(true);
  };

  const handleClose = () => {
    if (cameraRef.current) {
      setIsCameraReady(false);
    }
    router.back();
  };

  const tap = Gesture.Tap().onBegin(onTap);

  const takePicture = async () => {
    if (cameraRef.current && !isProcessing && isCameraReady) {
      try {
        setIsProcessing(true);
        const result = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: false,
        });

        if (!result || !result.uri) {
          throw new Error('Failed to capture image');
        }

        const fileName = `captured_image_${Date.now()}.jpg`;
        const analysis = await imageAnalysisService.analyzeImage(result.uri, fileName);

        router.push({
          pathname: '/ScanResults',
          params: {
            imageUrl: analysis.imageUrl,
            ingredients: JSON.stringify(analysis.ingredients),
            overallScore: analysis.overallScore.toString(),
          },
        });
      } catch (error: any) {
        console.error('Error capturing image:', error);
        Alert.alert('Error', error.message || 'An error occurred while capturing the image.');
      } finally {
        setIsProcessing(false);
      }
    } else if (!isCameraReady) {
      Alert.alert('Error', 'Camera is not ready yet. Please wait.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.backgroundContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            onCameraReady={handleCameraReady}
            autofocus={isRefreshing ? 'off' : 'on'}
          />
        </View>
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={1}
      >
        <View style={styles.content}>
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <View style={styles.headerAction}>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons color="#9CA3AF" name="close" size={20} />
              </TouchableOpacity>
            </View>
          </View>

          <GestureDetector gesture={tap}>
            <View style={styles.cameraContent}>
              {focusSquare.visible && (
                <View
                  style={[
                    styles.focusSquare,
                    { top: focusSquare.y - 25, left: focusSquare.x - 25 },
                  ]}
                />
              )}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.captureButton,
                    (!isCameraReady || isProcessing) && styles.disabledButton,
                  ]}
                  onPress={takePicture}
                  disabled={!isCameraReady || isProcessing}
                >
                  <Ionicons
                    name="camera"
                    size={36}
                    color={(!isCameraReady || isProcessing) ? '#999' : '#fff'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </GestureDetector>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  content: {
    flex: 1,
    minHeight: '100%',
  },
  cameraContent: {
    flex: 1,
    minHeight: '100%',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  headerAction: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    marginHorizontal: 12,
  },
  focusSquare: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
  },
  captureButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 50,
    padding: 15,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});