import { View, Text, StyleSheet } from 'react-native';

type Props = {
  title: string;
  toxicityRating: number;
  description: string;
};

export default function IngredientItem({ title, toxicityRating, description }: Props) {
  return (
    <View style={styles.ingredient}>
      <Text style={styles.ingredientTitle}>{title}</Text>
      <View style={styles.ingredientRating}>
        <Text style={styles.ingredientRatingLabel}>Toxicity rating:</Text>
        <Text style={styles.ingredientRatingScore}>{toxicityRating}</Text>
      </View>
      <Text style={styles.ingredientDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ingredient: {
    marginTop: 12,
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  ingredientTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600',
    letterSpacing: 0.38,
    color: '#000000',
    marginBottom: 6,
  },
  ingredientRating: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ingredientRatingLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 2,
  },
  ingredientRatingScore: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
  },
  ingredientDescription: {
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.078,
    color: '#8e8e93',
  },
});