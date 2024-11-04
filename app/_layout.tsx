// app/_layout.tsx
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="camera"
          options={{
            headerShown: false,
            animation: 'slide_from_bottom',
            animationDuration: 300,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="LoadingResultsInterstitial"
          options={{
            headerShown: false,
            animation: 'fade', // Smooth fade transition
            presentation: 'containedTransparentModal', // Modal presentation
          }}
        />
        <Stack.Screen
          name="ScanResults"
          options={{
            title: '', // We'll set this dynamically in the screen component
            headerBackTitle: 'Done'
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});