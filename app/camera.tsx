import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Animated,
  Text,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, Camera, BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAutofocus } from '@/hooks/useAutofocus';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openFoodFactsService } from '@/utils/openFoodFactsService';
import { imageAnalysisService } from '@/utils/imageAnalysisService';

type CameraMode = 'barcode' | 'ingredients';

// Define barcode scanning result type
interface BarcodeResult {
  type: string;
  data: string;
}

export default function CameraScreen() {
  const cameraRef = useRef<CameraView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [mode, setMode] = useState<CameraMode>('barcode');
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

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (isProcessing || mode !== 'barcode') return;
  
    try {
      setIsProcessing(true);
      const product = await openFoodFactsService.getProductByBarcode(result.data);
      
      if (product && product.ingredients_text) {
        // Product found - analyze ingredients
        const analysisResult = await imageAnalysisService.checkIngredients(product.ingredients_text);
        if (analysisResult) {
          const overallScore = imageAnalysisService.calculateOverallScore(
            analysisResult.ingredients
          );
  
          router.push({
            pathname: '/ScanResults',
            params: {
              scanResult: JSON.stringify({
                ...analysisResult,
                overallScore,
                source: 'open_food_facts',
                productData: product
              })
            }
          });
          return;
        }
      }
  
      // If we get here, either no product was found or it had no ingredients
      setMode('ingredients');
      Alert.alert(
        'Product Not Found',
        'Please take a clear photo of the ingredients list.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error processing barcode:', error);
      Alert.alert(
        'Error',
        'Failed to process barcode. Please take a photo of the ingredients list instead.',
        [{ text: 'OK' }]
      );
      setMode('ingredients');
    } finally {
      setIsProcessing(false);
    }
  };

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
        
        router.push({
          pathname: '/LoadingResultsInterstitial',
          params: {
            imageUri: result.uri,
            fileName
          }
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

  const renderGuidanceText = () => (
    <View style={styles.guidanceContainer}>
      <Text style={styles.guidanceText}>
        {mode === 'barcode' 
          ? 'Scan Product Barcode'
          : 'Take Photo of Ingredients'}
      </Text>
      <Text style={styles.guidanceSubtext}>
        {mode === 'barcode'
          ? 'Hold phone steady and align with barcode'
          : 'Ensure text is clear and well-lit'}
      </Text>
    </View>
  );

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
            barcodeScannerSettings={mode === 'barcode' ? {
              // Enable all barcode types for maximum compatibility
              barcodeTypes: [
                'aztec',
                'codabar', 
                'code39',
                'code93',
                'code128',
                'datamatrix',
                'ean8',
                'ean13',
                'itf14',
                'pdf417',
                'qr',
                'upc_e',
                'upc_a'
              ],
            } : undefined}
            onBarcodeScanned={mode === 'barcode' ? handleBarcodeScanned : undefined}
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
            {mode === 'ingredients' && (
              <TouchableOpacity 
                style={styles.modeSwitchButton}
                onPress={() => setMode('barcode')}
              >
                <Ionicons name="barcode" size={20} color="#9CA3AF" />
                <Text style={styles.modeSwitchText}>Try Barcode</Text>
              </TouchableOpacity>
            )}
          </View>

          {renderGuidanceText()}

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
                {mode === 'ingredients' && (
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
                )}
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
  guidanceContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 9998,
  },
  guidanceText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  guidanceSubtext: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  modeSwitchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    position: 'absolute',
    right: 12,
    gap: 4,
  },
  modeSwitchText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
});