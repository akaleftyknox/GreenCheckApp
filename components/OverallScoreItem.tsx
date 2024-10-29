// OverallScoreItem.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  overallScore: number;
};

export default function OverallScoreItem({ overallScore }: Props) {
  let backgroundColor = '#FFFFFF';
  let fontColor = '#000000';

  if (overallScore <= 1) {
    backgroundColor = '#84E1BC';
    fontColor = '#014737';
  } else if (overallScore <= 2) {
    backgroundColor = '#31C48D';
    fontColor = '#DEF7EC';
  } else if (overallScore <= 4) {
    backgroundColor = '#E3A008';
    fontColor = '#633112';
  } else if (overallScore <= 6) {
    backgroundColor = '#E3A008';
    fontColor = '#633112';
  } else if (overallScore <= 8) {
    backgroundColor = '#F98080';
    fontColor = '#771D1D';
  } else if (overallScore <= 10) {
    backgroundColor = '#F98080';
    fontColor = '#771D1D';
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.scoreText, { color: fontColor }]}>{overallScore.toFixed(2)}</Text>
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
  },
});
