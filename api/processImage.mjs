// api/processImage.mjs

import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define a Zod schema for the structured response
const IngredientAnalysisSchema = z.object({
  ingredients: z.array(
    z.object({
      ingredientTitle: z.string(),
      ingredientRating: z.number().int().min(0).max(10).nullable(),
      ingredientDescription: z.string().nullable(),
    })
  ),
});

// Define a Zod schema for request validation
const requestSchema = z.object({
  imageUrl: z.string().url(),
});

export default async (req, res) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', 'https://your-trusted-domain.com'); // Replace with your client's domain
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.warn('Received non-POST request:', req.method);
    return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
  }

  // Validate request body
  let imageUrl;
  try {
    const parsedBody = requestSchema.parse(req.body);
    imageUrl = parsedBody.imageUrl;
  } catch (validationError) {
    console.warn('Invalid request body:', validationError.errors);
    return res.status(400).json({ error: 'Invalid request body. Ensure "imageUrl" is a valid URL.' });
  }

  try {
    console.log('Sending request to OpenAI with image URL:', imageUrl);

    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06", // Ensure this is a supported model
      messages: [
        {
          role: "system",
          content: `You are a Consumer Safety Analyst dedicated to helping consumers make informed choices by analyzing the toxicity of ingredients in food, beverages, and topical products. Your work is crucial in enabling safer consumer decisions in an increasingly complex marketplace.

          <Expertise and Skills>
          Knowledge Base: You possess extensive knowledge of toxicology, consumer health safety, and environmental standards.
          Research Proficiency: You are adept at interpreting scientific research, studies, and health standards, including those from the Environmental Working Group (EWG).
          Communication: You have the ability to clearly communicate complex information in a simple, accessible manner that is understandable to non-experts, ensuring that consumers receive both accurate and actionable information.
          </Expertise and Skills>

          <Responsibilities>
          Ingredient Analysis: Analyze ingredients listed on product packaging for potential toxicity.
          Toxicity Rating: Rate each ingredient on a scale from 0 (no known toxicity) to 10 (highly toxic) based on the latest and most reliable scientific data.
          Consumer Education: Provide detailed, readable descriptions of each ingredient, including its use, benefits, and any potential health risks. Highlight notable findings from scientific studies or research relevant to consumer safety, ensuring that the information supports informed consumer choices.
          </Responsibilities>`,
        },
        {
          role: "user",
          content: `Please analyze the following image for ingredients, their rating, and description: ${imageUrl}`,
        },
      ],
      response_format: zodResponseFormat(IngredientAnalysisSchema, "ingredient_analysis_response"),
      max_tokens: 500, // Adjust as needed
    });

    console.log('OpenAI Completion:', completion.choices[0]);

    const assistantMessage = completion.choices[0].message;
    console.log('Received response from OpenAI:', assistantMessage.content);

    // Access the parsed structured data
    const parsedResponse = assistantMessage.parsed;
    console.log('Parsed JSON response:', parsedResponse);

    // Send the structured JSON response back to the client
    res.setHeader('Access-Control-Allow-Origin', 'https://your-trusted-domain.com'); // Replace with your client's domain
    res.status(200).json(parsedResponse);

  } catch (error) {
    if (error.response) {
      // OpenAI API returned an error response
      console.error('OpenAI API Error:', {
        status: error.response.status,
        data: error.response.data,
      });
      res.status(error.response.status).json({ error: error.response.data });
    } else if (error.request) {
      // No response received from OpenAI API
      console.error('No response received from OpenAI API:', error.request);
      res.status(502).json({ error: 'Bad Gateway. No response from OpenAI API.' });
    } else {
      // Other errors
      console.error('Error setting up OpenAI API request:', error.message);
      res.status(500).json({ error: 'Internal Server Error.' });
    }
  }
};