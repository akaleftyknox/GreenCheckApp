// OverallScoreItem.tsx

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

type Props = {
  overallScore: number;
};

export default function OverallScoreItem({ overallScore }: Props) {
  let backgroundColor = '#FFFFFF';
  let fontColor = '#000000';
  let grade = '';
  let ratingDescription = '';

  if (overallScore <= 1) {
    backgroundColor = '#84E1BC';
    fontColor = '#014737';
    grade = 'A+';
    ratingDescription = 'This product is as clean as it gets';
  } else if (overallScore <= 2) {
    backgroundColor = '#31C48D';
    fontColor = '#DEF7EC';
    grade = 'A';
    ratingDescription = 'Very low toxicity, very safe';
  } else if (overallScore <= 4) {
    backgroundColor = '#E3A008';
    fontColor = '#633112';
    grade = 'B';
    ratingDescription = 'Low toxicity, safe for use';
  } else if (overallScore <= 6) {
    backgroundColor = '#E3A008';
    fontColor = '#633112';
    grade = 'C';
    ratingDescription = 'Moderate toxicity, use caution';
  } else if (overallScore <= 8) {
    backgroundColor = '#F98080';
    fontColor = '#771D1D';
    grade = 'D';
    ratingDescription = 'High toxicity, limit usage';
  } else if (overallScore <= 10) {
    backgroundColor = '#F98080';
    fontColor = '#771D1D';
    grade = 'F';
    ratingDescription = 'Very high toxicity, avoid use';
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.scoreText, { color: fontColor }]}>{grade}</Text>
      <Text style={[styles.ratingDescription, { color: fontColor }]}>{ratingDescription}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  ratingDescription: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});