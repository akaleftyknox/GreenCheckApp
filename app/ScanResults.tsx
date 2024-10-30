import React, { useRef, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import GreenCheckSvg24 from '@/assets/images/greenCheckSvg_24.svg';
import GreenCheckSvg17 from '@/assets/images/greenCheckSvg_17.svg';

const SECTION_TOP_OFFSET = 300;
const SECTION_BORDER_RADIUS = 40;

type Ingredient = {
  id: string;
  title: string;
  toxicityRating: number;
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

  const imageUrl = params.imageUrl as string;
  const ingredients: Ingredient[] = JSON.parse(params.ingredients as string);
  const overallScore = parseFloat(params.overallScore as string);

  const getGradeInfo = (score: number) => {
    let grade = '';
    let ratingDescription = '';
    let badgeBackgroundColor = '#FFFFFF';
    const badgeFontColor = '#FFFFFF'; // Always white
    let backgroundColor = '#FFFFFF';

    if (score <= 1) {
      badgeBackgroundColor = '#014737';
      backgroundColor = '#BCF0DA';
      grade = 'A+';
      ratingDescription = 'This product is as clean as it gets';
    } else if (score <= 2) {
      badgeBackgroundColor = '#014737';
      backgroundColor = '#BCF0DA';
      grade = 'A';
      ratingDescription = 'Very low toxicity, very safe';
    } else if (score <= 4) {
      badgeBackgroundColor = '#633112';
      backgroundColor = '#FCE96A';
      grade = 'B';
      ratingDescription = 'Low toxicity, safe for use';
    } else if (score <= 6) {
      badgeBackgroundColor = '#633112';
      backgroundColor = '#FCE96A';
      grade = 'C';
      ratingDescription = 'Moderate toxicity, use caution';
    } else if (score <= 8) {
      badgeBackgroundColor = '#771D1D';
      backgroundColor = '#FBD5D5';
      grade = 'D';
      ratingDescription = 'High toxicity, limit usage';
    } else {
      badgeBackgroundColor = '#771D1D';
      backgroundColor = '#FBD5D5';
      grade = 'F';
      ratingDescription = 'Very high toxicity, avoid use';
    }

    return { grade, ratingDescription, badgeBackgroundColor, backgroundColor };
  };

  const getIngredientGradeInfo = (toxicityRating: number) => {
    let grade = '';
    let color = '#000000';

    if (toxicityRating <= 1) {
      color = '#014737';
      grade = 'A+';
    } else if (toxicityRating <= 2) {
      color = '#014737';
      grade = 'A';
    } else if (toxicityRating <= 4) {
      color = '#633112';
      grade = 'B';
    } else if (toxicityRating <= 6) {
      color = '#633112';
      grade = 'C';
    } else if (toxicityRating <= 8) {
      color = '#771D1D';
      grade = 'D';
    } else {
      color = '#771D1D';
      grade = 'F';
    }

    return { grade, color };
  };

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
      headerBackTitleStyle: {
        color: badgeBackgroundColor,
      },
    });
  }, [navigation, backgroundColor, badgeBackgroundColor]);

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
      <ScrollView
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
          <View style={styles.lessons}>
            <Text style={styles.lessonsTitle}>Ingredients</Text>

            {ingredients.map((ingredient, index) => {
              const { grade: ingredientGrade, color } =
                getIngredientGradeInfo(ingredient.toxicityRating);
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

                  <TouchableOpacity
                    onPress={() => {
                      // handle delete ingredient
                    }}
                    style={{
                      marginLeft: 'auto',
                    }}>
                    <View style={styles.cardAction}>
                      <Ionicons
                        color="#9CA3AF"
                        name="trash"
                        size={20}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
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
  lessons: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: SECTION_BORDER_RADIUS,
    borderTopRightRadius: SECTION_BORDER_RADIUS,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  ingredientsOverlay: {
    // Background color set dynamically
  },
  lessonsTitle: {
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
  cardAction: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
});