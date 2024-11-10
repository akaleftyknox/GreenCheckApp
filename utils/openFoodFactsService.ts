import { supabase } from './supabase';

export interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  ingredients_text: string;
  image_url?: string;
  ingredients_analysis_tags?: string[];
  ingredients: Array<{
    id: string;
    text: string;
    percent_estimate?: number;
    vegan?: string;
    vegetarian?: string;
  }>;
  nutriscore_grade?: string;
  nova_group?: number;
  ecoscore_grade?: string;
  selected_images?: {
    front?: {
      display?: { [key: string]: string };
    };
    ingredients?: {
      display?: { [key: string]: string };
    };
    nutrition?: {
      display?: { [key: string]: string };
    };
  };
  nutriments?: any;
}

interface OffProductRecord {
  barcode: string;
  product_name: string;
  ingredients_text: string | null;
  nutriscore_grade: string | null;
  nova_group: number | null;
  ecoscore_grade: string | null;
  images: any;
  nutriments: any;
  metadata: {
    ingredients: any[];
    ingredients_analysis_tags: string[];
  };
  last_fetched_at: string;
  created_at?: string;
  updated_at?: string;
}

export const openFoodFactsService = {
  async getProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
    try {
      // First check our database
      const { data: existingProduct } = await supabase
        .from('off_products')
        .select('*')
        .eq('barcode', barcode)
        .single();

      // If we have a recent product (less than 24 hours old), return it
      if (existingProduct && 
          new Date(existingProduct.last_fetched_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        return existingProduct;
      }

      // Otherwise fetch from API
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/barcode?barcode=${encodeURIComponent(barcode)}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const productData = await response.json();

      // Prepare the record for upsert
      const offProduct: OffProductRecord = {
        barcode: productData.code,
        product_name: productData.product_name,
        ingredients_text: productData.ingredients_text || null,
        nutriscore_grade: productData.nutriscore_grade || null,
        nova_group: productData.nova_group || null,
        ecoscore_grade: productData.ecoscore_grade || null,
        images: productData.selected_images || {},
        nutriments: productData.nutriments || {},
        metadata: {
          ingredients: productData.ingredients || [],
          ingredients_analysis_tags: productData.ingredients_analysis_tags || []
        },
        last_fetched_at: new Date().toISOString()
      };

      // Store or update in our database
      const { data: savedProduct, error } = await supabase
        .from('off_products')
        .upsert(offProduct, {
          onConflict: 'barcode'
        })
        .select()
        .single();

      if (error) throw error;
      return savedProduct;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  async saveOpenFoodFactsScan(
    userId: string,
    productData: OpenFoodFactsProduct,
    analysisResult: any
  ) {
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        user_id: userId,
        overall_grade: analysisResult.overallScore,
        overall_grade_description: analysisResult.ratingDescription,
        image_url: productData.image_url || analysisResult.imageUrl,
        scan_title: productData.product_name || analysisResult.scanTitle,
        barcode: productData.code,
        source: 'open_food_facts',
        is_public: false
      })
      .select()
      .single();

    if (scanError) throw scanError;

    const ingredientsToInsert = analysisResult.ingredients.map((ing: any) => ({
      scan_id: scan.id,
      ingredient_title: ing.title,
      toxicity_rating: ing.toxicityRating,
      description: ing.description
    }));

    const { error: ingredientsError } = await supabase
      .from('scan_ingredients')
      .insert(ingredientsToInsert);

    if (ingredientsError) throw ingredientsError;

    return scan;
  }
};