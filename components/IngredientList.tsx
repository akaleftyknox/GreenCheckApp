import React from 'react';
import { StyleSheet, FlatList, Pressable, ActivityIndicator, View } from 'react-native';
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
  isLoading?: boolean;
};

export default function IngredientList({ ingredients, onCloseModal, isLoading = false }: Props) {
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

  return (
    <View style={styles.container}>
      <FlatList
        data={ingredients}
        keyExtractor={(item: Ingredient) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
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
  pressable: {
    marginBottom: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});