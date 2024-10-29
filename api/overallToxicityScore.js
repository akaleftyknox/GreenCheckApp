// overallToxicityScore.js

// Import necessary modules
const OpenAI = require('openai');
const corsMiddleware = require('../utils/corsMiddleware.js');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

// Instantiate the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the schema for overall toxicity score
const OverallScoreSchema = z.object({
  overallScore: z.number(),
});

// Function to delay execution
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to calculate overall toxicity score with retries
async function calculateOverallScoreWithRetry(toxicityScores, retries = 3, retryDelay = 2000) {
  let retryCount = retries;
  while (retryCount > 0) {
    try {
      console.log(`Calculating overall toxicity score, attempt ${retries - retryCount + 1}`);

      const completion = await openai.beta.chat.completions.parse({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a data scientist specialized in calculating the overall toxicity of products based on individual ingredient scores.`,
          },
          {
            role: 'user',
            content: `Calculate the harmonic mean from the toxicity scores of these ingredients: ${JSON.stringify(
              toxicityScores
            )}. Return the result as a number in JSON format with key "overallScore".`,
          },
        ],
        response_format: zodResponseFormat(OverallScoreSchema, 'overall_score'),
        temperature: 0.1,
        max_tokens: 50,
      });

      const response = completion.choices[0].message.parsed;
      const overallScore = response.overallScore;

      if (typeof overallScore !== 'number' || isNaN(overallScore)) {
        throw new Error('Failed to parse overall toxicity score from OpenAI response.');
      }

      return overallScore;
    } catch (error) {
      const errorDetails = {
        name: error.name,
        message: error.message,
        status: error?.status,
        type: error?.type,
        code: error?.code,
        attempt: retries - retryCount + 1,
      };

      console.error('Error calculating overall toxicity score:', errorDetails);

      if (retryCount === 1) {
        throw new Error(`Final attempt failed: ${error.message}`);
      }
      retryCount--;
      await delay(retryDelay);
    }
  }
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

  const { analyzedIngredients } = req.body;

  if (!analyzedIngredients || !Array.isArray(analyzedIngredients)) {
    return res.status(400).json({ error: 'Invalid or missing analyzedIngredients in request body' });
  }

  try {
    const toxicityScores = analyzedIngredients.map((ingredient) => ingredient.toxicityRating);
    const overallScore = await calculateOverallScoreWithRetry(toxicityScores);

    res.status(200).json({ overallScore });
  } catch (error) {
    console.error('Error in overall toxicity score calculation:', error);
    res.status(500).json({
      error: 'Overall toxicity score calculation failed',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// Export the wrapped handler with CORS middleware
module.exports = corsMiddleware(withWrapper(handler));