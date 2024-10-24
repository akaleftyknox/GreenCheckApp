/// /utils/schemas.mjs

import { z } from "zod";

// Define schema for individual ingredients
export const IngredientSchema = z.object({
  ingredientTitle: z.string().describe("The name of the ingredient."),
  ingredientRating: z.number().int().min(0).max(10).nullable().describe("The toxicity rating of the ingredient on a scale from 0 to 10."),
  ingredientDescription: z.string().nullable().describe("A detailed description of the ingredient, including its use, benefits, and potential health risks."),
});

// Define schema for ingredient analysis
export const IngredientAnalysisSchema = z.object({
  ingredients: z.array(IngredientSchema).describe("List of ingredients with their respective details."),
});