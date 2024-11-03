// utils/db.ts

import { supabase } from './supabase';
import { Scan, ScanIngredient } from '@/types/database';

export const createScan = async (
  userId: string | undefined,
  scanData: {
    overall_grade: number;
    overall_grade_description: string;
    image_url: string;
    scan_title?: string;
    ingredients: Array<{
      title: string;
      toxicity_rating: number;
      description: string;
    }>;
  }
): Promise<{ scan: Scan | null; ingredients: ScanIngredient[] | null; error: Error | null }> => {
  try {
    // Insert scan
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        user_id: userId,
        overall_grade: scanData.overall_grade,
        overall_grade_description: scanData.overall_grade_description,
        image_url: scanData.image_url,
        scan_title: scanData.scan_title,
      })
      .select()
      .single();

    if (scanError) throw scanError;

    // Insert ingredients
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('scan_ingredients')
      .insert(
        scanData.ingredients.map((ingredient) => ({
          scan_id: scan.id,
          ingredient_title: ingredient.title,
          toxicity_rating: ingredient.toxicity_rating,
          description: ingredient.description,
        }))
      )
      .select();

    if (ingredientsError) throw ingredientsError;

    return { scan, ingredients, error: null };
  } catch (error) {
    console.error('Error creating scan:', error);
    return { scan: null, ingredients: null, error: error as Error };
  }
};

export const getScanWithIngredients = async (
  scanId: string
): Promise<{ scan: Scan; ingredients: ScanIngredient[] }> => {
  try {
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .single();

    if (scanError) throw scanError;

    const { data: ingredients, error: ingredientsError } = await supabase
      .from('scan_ingredients')
      .select('*')
      .eq('scan_id', scanId);

    if (ingredientsError) throw ingredientsError;

    return { scan, ingredients };
  } catch (error) {
    console.error('Error fetching scan with ingredients:', error);
    throw error;
  }
};