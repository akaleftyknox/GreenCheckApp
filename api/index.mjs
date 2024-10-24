// /api/index.mjs

import { extractTextFromImage } from "../utils/processImage.mjs";
import { analyzeIngredients } from "../utils/analyzeIngredients.mjs";

export default async (req, res) => {
  try {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*'); // Replace '*' with your client's domain for better security
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.status(200).end();
      return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      console.warn('Received non-POST request:', req.method);
      res.status(405).json({ error: 'Method not allowed. Please use POST.' });
      return;
    }

    // Parse the request body to get imageUrl
    const { imageUrl } = req.body;

    // Validate the presence of imageUrl
    if (!imageUrl) {
      console.warn('No imageUrl provided in request body:', req.body);
      res.status(400).json({ error: 'Image URL is required in the request body.' });
      return;
    }

    console.log('Received imageUrl:', imageUrl);

    // Step 1: Extract text from the image
    console.log('Calling extractTextFromImage...');
    const extractionResult = await extractTextFromImage(imageUrl);
    console.log('Text Extraction Result:', extractionResult);

    // Step 2: Analyze the extracted text for ingredients
    console.log('Calling analyzeIngredients...');
    const analysisResult = await analyzeIngredients(extractionResult.description);
    console.log('Ingredient Analysis Result:', analysisResult);

    // Respond to the client with the analysis result
    res.status(200).json(analysisResult);

  } catch (error) {
    // Handle errors from OpenAI API or other unexpected errors
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