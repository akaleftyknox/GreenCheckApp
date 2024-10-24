const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

const Ingredient = z.object({
  ingredientTitle: z.string().nullable(),
  ingredientRating: z.number().int().nullable(),
  ingredientDescription: z.string().nullable()
});

const IngredientAnalysis = z.object({
  ingredients: z.array(Ingredient)
});

module.exports = {
  ingredientAnalysisFormat: zodResponseFormat(IngredientAnalysis, "ingredient_analysis")
};