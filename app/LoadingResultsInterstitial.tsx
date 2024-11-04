import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import LottieView from 'lottie-react-native';
import { imageAnalysisService } from '@/utils/imageAnalysisService';

// Loading dots animation component
const LoadingDots = () => {
  const dotValues = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dotValues.map((dot, index) => 
      Animated.sequence([
        Animated.delay(index * 150),
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 400,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 400,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        ),
      ])
    );

    Animated.parallel(animations).start();

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, []);

  return (
    <>
      {dotValues.map((dot, index) => (
        <Animated.Text
          key={index}
          style={{
            opacity: dot,
            fontSize: 14,
            fontWeight: '700',
            color: '#54d378',
            marginLeft: 1,
            includeFontPadding: false,
            textAlignVertical: 'center',
            lineHeight: 14,
          }}>
          .
        </Animated.Text>
      ))}
    </>
  );
};

interface Step {
  title: string;
  number: number;
}

const ANALYSIS_STEPS: Step[] = [
  { title: 'Uploading Image', number: 1 },
  { title: 'Scanning for Ingredients', number: 2 },
  { title: 'Calculating GreenGrade', number: 3 },
];

const FUN_FACTS = [
  "Carrageenan, derived from seaweed, is used to thicken and stabilize dairy and plant-based milks but may cause digestive issues.",
  "Casein, a milk protein, is often used in 'non-dairy' creamers to enhance texture and flavor.",
  "Cellulose, made from wood pulp or cotton, is used as a fiber additive and anti-caking agent in shredded cheese.",
  "Xanthan Gum, a thickener derived from bacteria, is used in salad dressings and gluten-free products but can cause digestive distress in some people.",
  "Guar Gum, sourced from guar beans, is commonly used to thicken ice cream but can cause gastrointestinal upset in large amounts.",
  "Titanium Dioxide, used for whitening, is found in powdered sugar, dressings, and toothpaste but is a potential carcinogen.",
  "Propylene Glycol, a solvent in soft drinks and a common ingredient in antifreeze, can also preserve moisture in packaged snacks.",
  "Tertiary Butylhydroquinone (TBHQ), a preservative in snack foods, can extend shelf life but may impact immune health.",
  "Castoreum, extracted from beaver glands, is sometimes used as a natural flavoring in vanilla or raspberry flavored foods.",
  "Aluminum Sulfate is used in baking powder and flour treatment but is linked to cognitive decline with excessive exposure.",
  "Soy Lecithin, used as an emulsifier in chocolates and salad dressings, can cause mild allergic reactions in sensitive individuals.",
  "Shellac, derived from the lac bug, is used as a shiny coating on candies and pills.",
  "Azodicarbonamide, used in some breads as a dough conditioner, is also utilized in the production of foam plastics.",
  "Potassium Bromate, a dough strengthener in bread, is banned in many countries due to cancer risk concerns.",
  "Polysorbate 80, an emulsifier in ice cream, is linked to inflammation and metabolic disorders.",
  "Magnesium Stearate, a flow agent in supplements, is derived from animal or vegetable fats and can hinder nutrient absorption.",
  "BHT (Butylated Hydroxytoluene), a synthetic antioxidant in cereals, has been shown to cause cancer in animal studies.",
  "Sodium Benzoate, used as a preservative in acidic foods like salad dressings and carbonated drinks, can convert to benzene, a known carcinogen.",
  "Phosphoric Acid, added to sodas to give them a sharper flavor, can contribute to lower bone density.",
  "Red Dye 40, derived from petroleum, is linked to hyperactivity in children and immune system tumors in mice.",
  "Methylisothiazolinone, used as a preservative in shampoos and lotions, is a common cause of contact dermatitis.",
  "Oxybenzone, found in many sunscreens, can disrupt hormonal activity and is also harmful to coral reefs.",
  "Triclosan, used in antibacterial soaps and deodorants, is linked to antibiotic resistance and hormone disruption.",
  "Toluene, a solvent in nail polish and hair dyes, can affect the nervous system and cause reproductive harm.",
  "Coal Tar, used in dandruff shampoos and anti-itch creams, is a recognized carcinogen by the World Health Organization.",
  "Formaldehyde, released by preservatives in cosmetics, is a potent allergen and carcinogen.",
  "Phthalates, often hidden under 'fragrance' in labels, are linked to endocrine disruption and reproductive issues.",
  "Paraffin, derived from petroleum and used in lipsticks and moisturizers, can be contaminated with carcinogenic compounds.",
  "Polyethylene Glycols (PEGs), used in many skin creams as thickeners, can be contaminated with ethylene oxide and 1,4-dioxane, both known carcinogens.",
  "Siloxanes, used to soften, smooth, and moisten in hair products and deodorants, are suspected endocrine disrupters and reproductive toxicants.",
  "Retinyl Palmitate, used in moisturizers and sunscreens, may speed the development of skin tumors and lesions on sun-exposed skin.",
  "Hydroquinone, a skin lightener found in whitening creams, is linked to cancer and can cause ochronosis, a skin disfiguration.",
  "Aluminum Compounds, used in antiperspirants, are suspected to be linked to breast cancer and Alzheimer’s disease.",
  "Synthetic Musks, found in perfumes and lotions, are persistent in the human body and can disrupt hormones.",
  "Talc, used in baby powders and face powders, can contain asbestos fibers, which are carcinogenic.",
  "Lead Acetate, used in some hair dyes and cleansers, is toxic to the reproductive system and can harm fetal development.",
  "Benzophenone, used in lip balms and nail polishes, is linked to cancer and endocrine disruption.",
  "Butoxyethanol, found in fragrances and hair sprays, can cause skin and eye irritation and is harmful if inhaled.",
  "Dibutyl Phthalate (DBP), used in nail polishes, is banned in the EU and is known to cause reproductive issues.",
  "Ethanolamines (MEA/DEA/TEA), found in soaps and shampoos, can react with other chemicals to form carcinogens.",
];

export default function LoadingResultsInterstitial() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const imageUri = params.imageUri as string;
  const fileName = params.fileName as string;
  
  const [currentStep, setCurrentStep] = useState<Step>(ANALYSIS_STEPS[0]);
  const [funFact] = useState(() => 
    FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]
  );
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  useEffect(() => {
    let mounted = true;

    const performAnalysis = async () => {
      try {
        if (!imageUri || !fileName) {
          throw new Error('Missing required parameters');
        }

        // Step 1: Upload Image
        setCurrentStep(ANALYSIS_STEPS[0]);
        const uploadedUrl = await imageAnalysisService.uploadImageToSupabase(imageUri, fileName);
        
        if (!mounted) return;

        // Step 2: Scan Ingredients
        setCurrentStep(ANALYSIS_STEPS[1]);
        const analysisResult = await imageAnalysisService.checkIngredients(uploadedUrl);
        
        if (!mounted) return;

        // Step 3: Calculate Grade and Create Scan
        setCurrentStep(ANALYSIS_STEPS[2]);
        const result = await imageAnalysisService.analyzeImage(imageUri, fileName);

        if (!mounted) return;

        // Replace current screen with ScanResults
        router.replace({
          pathname: '/ScanResults',
          params: { 
            imageUrl: result.imageUrl,
            ingredients: JSON.stringify(result.ingredients),
            overallScore: result.overallScore.toString(),
            scanTitle: result.scanTitle || 'Untitled'
          }
        });
      } catch (error) {
        console.error('Analysis failed:', error);
        if (mounted) {
          Alert.alert('Error', 'Failed to analyze image. Please try again.');
          router.back();
        }
      } finally {
        if (mounted) {
          setIsAnalyzing(false);
        }
      }
    };

    performAnalysis();

    return () => {
      mounted = false;
    };
  }, [imageUri, fileName, router]);

  const handleCancel = () => {
    Alert.alert(
      'Stop Analysis',
      'Are you sure you want to stop analyzing the ingredients of the product you scanned?',
      [
        {
          text: "Don't stop",
          style: 'cancel',
        },
        {
          text: 'Yes, stop',
          style: 'destructive',
          onPress: () => {
            setIsAnalyzing(false);
            router.replace('/');
          },
        },
      ]
    );
  };

  if (!isAnalyzing) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingResults}>
        <LottieView
          source={require('@/assets/animations/analyzeAnimation.json')}
          autoPlay
          loop
          style={styles.loadingResultsAnimation}
        />
  
        <View style={styles.stepContainer}>
          <Text style={styles.loadingResultsStep}>
            Step {currentStep.number} of {ANALYSIS_STEPS.length}
          </Text>
          <LoadingDots />
        </View>
  
        <Text style={styles.loadingResultsTitle}>
          {currentStep.title}
        </Text>

        <Text style={styles.funFactTitle}>
          GreenCheck Fun Fact
        </Text>
  
        <Text style={styles.loadingResultsFunFact}>
          {funFact}
        </Text>
  
        <View style={styles.loadingResultsFooter}>
          <TouchableOpacity onPress={handleCancel}>
            <View style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryText}>Stop analysis</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    includeFontPadding: false,
  },
  loadingResults: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  loadingResultsAnimation: {
    width: 300,
    height: 300,
    marginBottom: 24,
  },
  loadingResultsStep: {
    fontSize: 14,
    fontWeight: '700',
    color: '#014737',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    includeFontPadding: false,
    lineHeight: 14,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingResultsTitle: {
    marginBottom: 24, // Updated to 24px
    fontSize: 27,
    fontWeight: '700',
    color: '#000000',
  },
  funFactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#014737',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingResultsFunFact: {
    marginBottom: 24,
    paddingHorizontal: 48,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  loadingResultsFooter: {
    marginTop: 'auto',
    alignSelf: 'stretch',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    marginTop: 8,
  },
  btnSecondaryText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: '#D1D5DB',
  },
});