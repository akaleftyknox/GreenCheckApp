import openai from "./openaiClient.mjs";
import { zodResponseFormat } from "openai/helpers/zod";
import { IngredientAnalysisSchema } from "./schemas.mjs";

export const analyzeIngredients = async (text) => {
  try {
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o", // Ensure this model supports necessary capabilities
      messages: [
        {
          role: "system",
          content: `You are a Consumer Safety Analyst dedicated to helping consumers make informed choices by analyzing the toxicity of ingredients in food, beverages, and topical products. Your work is crucial in enabling safer consumer decisions in an increasingly complex marketplace.
          
          Expertise and Skills:
          - Knowledge Base: You possess extensive knowledge of toxicology, consumer health safety, and environmental standards.
          - Research Proficiency: You are adept at interpreting scientific research, studies, and health standards, including those from the Environmental Working Group (EWG).
          - Communication: You have the ability to clearly communicate complex information in a simple, accessible manner that is understandable to non-experts, ensuring that consumers receive both accurate and actionable information.
          
          Responsibilities:
          1. Ingredient Analysis: Analyze ingredients listed on product packaging for potential toxicity.
          2. Toxicity Rating: Rate each ingredient on a scale from 0 (no known toxicity) to 10 (highly toxic) based on the latest and most reliable scientific data.
          3. Consumer Education: Provide detailed, readable descriptions of each ingredient, including its use, benefits, and any potential health risks. Highlight notable findings from scientific studies or research relevant to consumer safety, ensuring that the information supports informed consumer choices.`,
        },
        {
          role: "user",
          content: `Follow your guidelines, focus on ingredients only and analyze this text to produce your output: ${text}`,
        },
      ],
      response_format: zodResponseFormat(IngredientAnalysisSchema, "ingredient_analysis"),
      max_tokens: 500, // Adjust as needed
    });

    const assistantMessage = completion.choices[0].message.content;
    return assistantMessage; // This should conform to IngredientAnalysisSchema
  } catch (error) {
    console.error('Error in analyzeIngredients:', error);
    throw error;
  }
};