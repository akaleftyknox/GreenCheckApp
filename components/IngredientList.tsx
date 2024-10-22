import React from 'react';
import { StyleSheet, FlatList, Pressable } from 'react-native';
import IngredientItem from '@/components/IngredientItem';
import IngredientsNotFound from '@/components/IngredientsNotFound';

type Ingredient = {
  id: string;
  title: string;
  toxicityRating: number;
  description: string;
};

type Props = {
  ingredients: Ingredient[];
  onCloseModal: () => void;
};

export default function IngredientList({ ingredients, onCloseModal }: Props) {
  const renderItem = ({ item }: { item: Ingredient }) => (
    <Pressable
      onPress={() => {
        onCloseModal();
      }}
      style={styles.pressable}
      key={item.id}
    >
      <IngredientItem
        title={item.title}
        toxicityRating={item.toxicityRating}
        description={item.description}
      />
    </Pressable>
  );

  if (ingredients.length === 0) {
    return <IngredientsNotFound />;
  }

  return (
    <FlatList
      data={ingredients}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
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
});