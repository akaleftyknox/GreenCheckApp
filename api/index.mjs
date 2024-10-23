import { extractTextFromImage } from "./processImage.mjs";
import { analyzeIngredients } from "./analyzeIngredients.mjs";

export default async (req, res) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Replace '*' with your client's domain for better security
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.warn('Received non-POST request:', req.method);
    return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
  }

  const { imageUrl } = req.body;

  if (!imageUrl) {
    console.warn('No imageUrl provided in request body:', req.body);
    return res.status(400).json({ error: 'Image URL is required in the request body.' });
  }

  try {
    // Step 1: Extract text from image
    const extractionResult = await extractTextFromImage(imageUrl);
    console.log('Text Extraction Result:', extractionResult);

    // Step 2: Analyze extracted text for ingredients
    const analysisResult = await analyzeIngredients(extractionResult.description);
    console.log('Ingredient Analysis Result:', analysisResult);

    // Send the final analysis result to the client
    res.status(200).json(analysisResult);

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