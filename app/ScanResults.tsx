// app/ScanResults.tsx

import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { getScanWithIngredients } from '@/utils/db';
import { getGradeInfo, getIngredientGradeInfo } from '@/utils/gradeUtils';
import GreenCheckSvg24 from '@/assets/images/greenCheckSvg_24.svg';
import GreenCheckSvg17 from '@/assets/images/greenCheckSvg_17.svg';
import { ScanIngredient } from '@/types/database';

const SECTION_TOP_OFFSET = 300;
const SECTION_BORDER_RADIUS = 40;

type Ingredient = {
  title: string;
  toxicity_rating: number;
  description: string;
};

export default function ScanResults() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const animatedBackgroundScale = scrollY.interpolate({
    inputRange: [
      -SECTION_TOP_OFFSET - 100,
      -SECTION_TOP_OFFSET,
      0,
      SECTION_TOP_OFFSET,
      SECTION_TOP_OFFSET + 50,
      SECTION_TOP_OFFSET + 100,
    ],
    outputRange: [1.5, 1.25, 1.1, 1, 0, 0],
  });

  const params = useLocalSearchParams();
  const navigation = useNavigation();

  const scanId = params.scanId as string | undefined;
  const imageUrlParam = params.imageUrl as string | undefined;
  const ingredientsParam = params.ingredients as string | undefined;
  const overallScoreParam = params.overallScore as string | undefined;

  const [ingredients, setIngredients] = useState<Ingredient[] | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [overallScore, setOverallScore] = useState<number>(0);

  useEffect(() => {
    const fetchScanData = async () => {
      try {
        if (scanId) {
          const { scan, ingredients } = await getScanWithIngredients(scanId);
          setImageUrl(scan.image_url);
          setOverallScore(scan.overall_grade);

          const formattedIngredients = ingredients.map((ing) => ({
            title: ing.ingredient_title,
            toxicity_rating: ing.toxicity_rating,
            description: ing.description || 'No description available',
          }));
          setIngredients(formattedIngredients);
        } else if (imageUrlParam && ingredientsParam && overallScoreParam) {
          setImageUrl(imageUrlParam);
          setOverallScore(parseFloat(overallScoreParam));

          const parsedIngredients = JSON.parse(ingredientsParam);
          const formattedIngredients = parsedIngredients.map((ing: any) => ({
            title: ing.title,
            toxicity_rating: ing.toxicityRating,
            description: ing.description || 'No description available',
          }));
          setIngredients(formattedIngredients);
        } else {
          throw new Error('No scan data available');
        }
      } catch (error) {
        console.error('Error fetching scan data:', error);
        Alert.alert('Error', 'Could not fetch scan data.');
      }
    };

    fetchScanData();
  }, [scanId, imageUrlParam, ingredientsParam, overallScoreParam]);

  const { grade, ratingDescription, badgeBackgroundColor, backgroundColor } =
    getGradeInfo(overallScore);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: backgroundColor,
      },
      headerTintColor: badgeBackgroundColor,
      headerTitleStyle: {
        color: badgeBackgroundColor,
      },
      headerBackTitle: 'Done',
    });
  }, [navigation, backgroundColor, badgeBackgroundColor]);

  if (!imageUrl || !ingredients) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading scan data...</Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: 'white', flex: 1 }}>
      <Animated.View
        style={{
          transform: [
            {
              scaleX: animatedBackgroundScale,
            },
            {
              scaleY: animatedBackgroundScale,
            },
          ],
        }}>
        <Image
          style={styles.backdrop}
          resizeMode="cover"
          source={{
            uri: imageUrl,
          }}
        />
      </Animated.View>
      <Animated.ScrollView
        style={styles.container}
        onScroll={Animated.event(
          [
            {
              nativeEvent: {
                contentOffset: {
                  y: scrollY,
                },
              },
            },
          ],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={1}>
        <View style={[styles.content, { backgroundColor }]}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: badgeBackgroundColor }]}>
              GreenGrade
            </Text>

            <View
              style={[
                styles.headerBadge,
                { backgroundColor: badgeBackgroundColor },
              ]}>
              {grade === 'A+' ? (
                <GreenCheckSvg24 width={24} height={24} />
              ) : (
                <Text style={styles.gradeText}>{grade}</Text>
              )}
            </View>
          </View>

          <Text style={[styles.text, { color: badgeBackgroundColor }]}>
            {ratingDescription}
          </Text>
        </View>
        <View style={[styles.ingredientsOverlay, { backgroundColor }]}>
          <View style={styles.ingredients}>
            <Text style={styles.ingredientsTitle}>Ingredients</Text>

            {ingredients.map((ingredient, index) => {
              const { grade: ingredientGrade, color } =
                getIngredientGradeInfo(ingredient.toxicity_rating);
              return (
                <View key={index} style={styles.card}>
                  {ingredientGrade === 'A+' ? (
                    <GreenCheckSvg17
                      width={17}
                      height={17}
                      style={[styles.cardIcon]}
                    />
                  ) : (
                    <Text style={[styles.cardIcon, { color }]}>
                      {ingredientGrade}
                    </Text>
                  )}

                  <View style={{ flex: 1, marginRight: 16 }}>
                    <Text
                      style={styles.cardTitle}
                      numberOfLines={1}
                      ellipsizeMode="tail">
                      {ingredient.title}
                    </Text>

                    <Text style={styles.cardDuration}>
                      {ingredient.description}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    height: 400,
  },
  container: {
    flex: 1,
    position: 'relative',
    zIndex: 2,
  },
  content: {
    flex: 1,
    marginTop: SECTION_TOP_OFFSET,
    borderTopLeftRadius: SECTION_BORDER_RADIUS,
    borderTopRightRadius: SECTION_BORDER_RADIUS,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  text: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerBadge: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  ingredients: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: SECTION_BORDER_RADIUS,
    borderTopRightRadius: SECTION_BORDER_RADIUS,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  ingredientsOverlay: {},
  ingredientsTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: '#111928',
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingVertical: 12,
  },
  cardIcon: {
    fontSize: 17,
    fontWeight: '700',
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111928',
    marginBottom: 16,
  },
  cardDuration: {
    fontSize: 13,
    fontWeight: '400',
    color: '#4B5563',
  },
});