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
    { key: 'overallScore', type: 'overallScore' },
    ...ingredients.map((ingredient) => ({ key: ingredient.id, type: 'ingredient', ingredient })),
  ];

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'overallScore') {
      if (overallScore !== null) {
        return <OverallScoreItem overallScore={overallScore} />;
      } else {
        return null;
      }
    } else if (item.type === 'ingredient') {
      const ingredient = item.ingredient;
      return (
        <View style={styles.itemContainer}>
          <IngredientItem
            title={ingredient.title}
            toxicityRating={ingredient.toxicityRating}
            description={ingredient.description}
          />
        </View>
      );
    } else {
      return null;
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  itemContainer: {
    marginBottom: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
