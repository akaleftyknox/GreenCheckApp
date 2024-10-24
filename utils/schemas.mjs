import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

// Define the schema for a single ingredient
const Ingredient = z.object({
  ingredientTitle: z.string().nullable(),
  ingredientRating: z.number().int().nullable(),
  ingredientDescription: z.string().nullable()
});

// Define the full response schema
const IngredientAnalysis = z.object({
  ingredients: z.array(Ingredient)
});

// Export the response format
export const ingredientAnalysisFormat = zodResponseFormat(IngredientAnalysis, "ingredient_analysis");