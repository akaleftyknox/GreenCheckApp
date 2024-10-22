import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function IngredientsNotFound() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>No Ingredients Found</Text>
      <Text style={styles.description}>
        We couldn't identify any ingredients in the selected image. Please try another photo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
});
