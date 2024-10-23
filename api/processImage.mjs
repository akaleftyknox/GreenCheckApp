// api/processImage.mjs

import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import axios from 'axios';
import Tesseract from 'tesseract.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define a Zod schema for the structured response
const IngredientAnalysisSchema = z.object({
  ingredients: z.array(
    z.object({
      ingredientTitle: z.string(),
      ingredientRating: z.number().int(),
      ingredientDescription: z.string(),
    })
  ),
});

// Define a Zod schema for request validation
const requestSchema = z.object({
  imageUrl: z.string().url(),
});

// Function to parse ingredients from OCR text
const parseIngredients = (text) => {
  // Implement parsing logic based on the OCR output format
  // For example, split by commas or new lines
  return text.split(/[\n,]+/).map(ingredient => ingredient.trim()).filter(Boolean);
};

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
    console.log('Fetching image from URL:', imageUrl);
    
    // Step 1: Fetch the image
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data, 'binary');

    // Step 2: Perform OCR
    console.log('Performing OCR on the image');
    const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng');

    // Step 3: Extract Ingredients
    const ingredientsList = parseIngredients(text);
    console.log('Extracted Ingredients:', ingredientsList);

    if (ingredientsList.length === 0) {
      return res.status(400).json({ error: 'No ingredients found in the image.' });
    }

    // Step 4: Send to OpenAI for analysis
    console.log('Sending ingredients to OpenAI for analysis');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Corrected model name
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
          content: `Please analyze the following list of ingredients for potential toxicity, provide a rating from 0 (no toxicity) to 10 (high toxicity), and offer detailed descriptions: ${ingredientsList.join(', ')}`,
        },
      ],
      response_format: zodResponseFormat(IngredientAnalysisSchema, "ingredient_analysis_response"),
      max_tokens: 1000, // Increased token limit if needed
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
      console.error('Error:', error.message);
      res.status(500).json({ error: 'Internal Server Error.' });
    }
  }
};