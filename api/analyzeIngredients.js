// Import necessary modules
const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');
const corsMiddleware = require('../utils/corsMiddleware.js');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

// Define the schema for ingredient analysis using zod
const IngredientAnalysisSchema = z.object({
  ingredients: z.array(
    z.object({
      ingredientTitle: z.string(),
      ingredientRating: z.number().min(0).max(10),
      ingredientDescription: z.string(),
    })
  ),
});

// Instantiate the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to delay execution
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to transform ingredients
function transformIngredients(openAIIngredients) {
  return openAIIngredients.map((ing) => ({
    id: uuidv4(),
    title: ing.ingredientTitle,
    toxicityRating: ing.ingredientRating,
    description: ing.ingredientDescription,
  }));
}

// Function to handle retries
async function analyzeIngredientsWithRetry(extractedText, retries = 3, retryDelay = 2000) {
  console.log('Starting analysis with OpenAI configuration.');

  // Split ingredients into a list
  const ingredientsList = extractedText
    .split(',')
    .map((i) => i.trim())
    .filter((i) => i.length > 0);

  const BATCH_SIZE = 5;
  let allIngredients = [];

  for (let i = 0; i < ingredientsList.length; i += BATCH_SIZE) {
    const batchIngredients = ingredientsList.slice(i, i + BATCH_SIZE);
    const batchText = batchIngredients.join(', ');

    let retryCount = retries;
    while (retryCount > 0) {
      try {
        console.log(`Analyzing batch ${i / BATCH_SIZE + 1}, attempt ${4 - retryCount}`);
        const startTime = Date.now();

        const completion = await openai.beta.chat.completions.parse({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a Consumer Safety Analyst. For each ingredient, provide:
              - The exact ingredient name as ingredientTitle
              - A safety rating (0-10, 0 safest) as ingredientRating
              - A brief, concise description as ingredientDescription
              Be concise but accurate.`,
            },
            {
              role: 'user',
              content: `Analyze these ingredients: ${batchText}`,
            },
          ],
          response_format: zodResponseFormat(IngredientAnalysisSchema, 'ingredient_analysis'),
          temperature: 0.1,
          max_tokens: 1000,
        });

        console.log(`Batch completed in ${Date.now() - startTime}ms`);

        const response = completion.choices[0].message.parsed;
        allIngredients = [...allIngredients, ...response.ingredients];
        break;
      } catch (error) {
        const errorDetails = {
          name: error.name,
          message: error.message,
          status: error?.status,
          type: error?.type,
          code: error?.code,
          attempt: 4 - retryCount,
          batch: i / BATCH_SIZE + 1,
        };

        console.error('Batch analysis failed:', errorDetails);

        if (retryCount === 1) {
          throw new Error(`Final attempt failed for batch ${i / BATCH_SIZE + 1}: ${error.message}`);
        }

        retryCount--;
        await delay(retryDelay);
      }
    }
  }

  const transformedIngredients = transformIngredients(allIngredients);

  return {
    ingredients: transformedIngredients,
  };
}

// Wrapper function to add additional functionality without modifying the handler
const withWrapper = (handler) => async (req, res) => {
  console.log('Wrapper: Incoming request', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
  });

  try {
    await handler(req, res);
    console.log('Wrapper: Handler executed successfully.');
  } catch (error) {
    console.error('Wrapper: Error during handler execution:', error);
    // Optionally, send a generic error response if not already handled
    if (!res.headersSent) {
      res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  } finally {
    console.log('Wrapper: Request processing completed.');
  }
};

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { extractedText } = req.body;

  if (!extractedText) {
    return res.status(400).json({ error: 'No text provided' });
  }

  try {
    const startTime = Date.now();
    console.log('Starting ingredient analysis...');

    const analysisResult = await analyzeIngredientsWithRetry(extractedText);

    console.log(`Analysis completed in ${Date.now() - startTime}ms`);

    res.status(200).json({
      analysis: analysisResult,
      processingTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Fatal error in ingredient analysis:', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Analysis failed',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Export the wrapped handler with CORS middleware
module.exports = corsMiddleware(withWrapper(handler));