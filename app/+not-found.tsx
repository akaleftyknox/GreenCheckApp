import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function IngredientsNotFound() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>No ingredients found.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  text: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
  },
});