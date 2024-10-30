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

type DataItem =
  | { type: 'overallScore' }
  | { type: 'ingredient'; ingredient: Ingredient };

type Props = {
  ingredients: Ingredient[];
  overallScore: number | null;
  onCloseModal: () => void;
  isLoading?: boolean;
};

export default function IngredientList({
  ingredients,
  overallScore,
  onCloseModal,
  isLoading = false,
}: Props) {
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

  const data: DataItem[] = [
    { type: 'overallScore' },
    ...ingredients.map((ingredient) => ({
      type: 'ingredient' as const,
      ingredient,
    })),
  ];

  const renderItem = ({ item }: { item: DataItem }) => {
    if (item.type === 'overallScore') {
      if (overallScore !== null) {
        return <OverallScoreItem overallScore={overallScore} />;
      }
      return null;
    }
    return (
      <IngredientItem
        title={item.ingredient.title}
        toxicityRating={item.ingredient.toxicityRating}
        description={item.ingredient.description}
      />
    );
  };

  return (
    <FlatList
      data={data}
      keyExtractor={(item, index) => index.toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});