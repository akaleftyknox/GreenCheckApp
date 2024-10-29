// IngredientList.tsx

import React from 'react';
import { StyleSheet, FlatList, View, ActivityIndicator } from 'react-native';
import IngredientItem from '@/components/IngredientItem';
import OverallScoreItem from '@/components/OverallScoreItem';
import IngredientsNotFound from '@/components/IngredientsNotFound';

type Ingredient = {
  id: string;
  title: string;
  toxicityRating: number;
  description: string;
};

type Props = {
  ingredients: Ingredient[];
  overallScore: number | null;
  onCloseModal: () => void;
  isLoading?: boolean;
};

export default function IngredientList({ ingredients, overallScore, onCloseModal, isLoading = false }: Props) {
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ff6a55" />
      </View>
    );
  }

  if (!ingredients || ingredients.length === 0) {
    return <IngredientsNotFound />;
  }

  const data = [
    { key: 'overallScore' },
    ...ingredients.map((ingredient) => ({ key: ingredient.id, ingredient })),
  ];

  const renderItem = ({ item }: { item: any }) => {
    if (item.key === 'overallScore') {
      if (overallScore !== null) {
        return <OverallScoreItem overallScore={overallScore} />;
      } else {
        return null;
      }
    } else {
      const ingredient = item.ingredient;
      return (
        <View style={styles.pressable} key={ingredient.id}>
          <IngredientItem
            title={ingredient.title}
            toxicityRating={ingredient.toxicityRating}
            description={ingredient.description}
          />
        </View>
      );
    }
  };

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.key}
      renderItem={renderItem}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  pressable: {
    marginBottom: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});