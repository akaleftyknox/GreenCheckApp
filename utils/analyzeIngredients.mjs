// /utils/analyzeIngredients.mjs

import openai from "./openaiClient.mjs";
import { IngredientAnalysisSchema } from "./schemas.mjs";

export const analyzeIngredients = async (text) => {
  try {
    console.log('Starting analyzeIngredients function');

    // Define a timeout promise
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('OpenAI API request timed out')), 8000) // 8 seconds
    );

    // Make the OpenAI API call
    const completionPromise = openai.chat.completions.create({
      model: "gpt-4", // Correct model name
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
      max_tokens: 300, // Reduced to speed up response
      temperature: 0.2, // Adjust for response variability
    });

    // Race between the API call and the timeout
    const completion = await Promise.race([completionPromise, timeout]);

    console.log('Received response from OpenAI for ingredient analysis');
    const assistantMessage = completion.data.choices[0].message.content;
    console.log('Assistant Message:', assistantMessage);

    // Parse the assistant's message as JSON
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(assistantMessage);
      console.log('Parsed Message:', parsedMessage);
    } catch (parseError) {
      console.error('Error parsing assistant message as JSON:', parseError);
      throw new Error('Invalid JSON format in OpenAI response.');
    }

    // Validate the response using Zod
    const analysisResult = IngredientAnalysisSchema.parse(parsedMessage);
    console.log('Validation successful');

    return analysisResult; // This conforms to IngredientAnalysisSchema
  } catch (error) {
    console.error('Error in analyzeIngredients:', error);
    throw error; // Let the caller handle the error
  }
};