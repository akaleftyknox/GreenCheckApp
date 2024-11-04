// api/analyzeIngredients.js
const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');
const corsMiddleware = require('../utils/corsMiddleware.js');
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

// Define the schema for ingredient analysis using zod
const IngredientAnalysisSchema = z.object({
  scanTitle: z.string().nullable(),
  ingredients: z.array(
    z.object({
      ingredientTitle: z.string().nullable(),
      ingredientRating: z.number().nullable(),
      ingredientDescription: z.string().nullable(),
    })
  ),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function transformIngredients(analysisResult) {
  if (!analysisResult || !analysisResult.ingredients) {
    console.error('Invalid analysis result:', analysisResult);
    throw new Error('Invalid analysis result structure');
  }

  return {
    scanTitle: analysisResult.scanTitle || null,
    ingredients: analysisResult.ingredients.map((ing) => ({
      id: uuidv4(),
      title: ing.ingredientTitle,
      toxicityRating: ing.ingredientRating,
      description: ing.ingredientDescription,
    })),
  };
}

async function analyzeIngredientsWithRetry(extractedText, retries = 3, retryDelay = 2000) {
  console.log('Starting analysis with OpenAI configuration.');

  // Split ingredients into a list
  const ingredientsList = extractedText
    .split(',')
    .map((i) => i.trim())
    .filter((i) => i.length > 0);

  const BATCH_SIZE = 5;
  let allIngredients = [];
  let scanTitle = null;

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
              role: "system",
              "content": [
                {
                  "type": "text",
                  "text": "Analyze each product's ingredients and generate a detailed risk assessment report, focusing strictly on ingredient safety based on current scientific evidence.\n\nFor each product analyzed:\n- Extract ingredients and rate their safety.\n- Ensure consumer-friendly explanations, avoiding unnecessary information.\n\n# Steps\n\n1. **Identify Overall Product:** Output a 1-3 word product description labeled as scanTitle.\n2. **Ingredient Analysis:**\n   - **Ingredient Name Extraction:** Extract the exact name of each ingredient, label it as ingredientTitle.\n   - **Safety Rating Assignment:** Evaluate each ingredient with a safety rating from 0 (safest) to 10 (least safe). Label this as ingredientRating.\n   - **Consumer-Friendly Description:** Provide a fact-based, concise description of each ingredient that is easy for a consumer to understand. Label it as ingredientDescription.\n3. **Ignore Non-Relevant Text:** Disregard any other information not directly linked to ingredients.\n\n# Output Format\n\nEach output should be a JSON object with a scanTitle and an array of ingredients, each containing ingredientTitle, ingredientRating, and ingredientDescription.\n\n# Example Output Structure\n{\n  scanTitle: \"Shampoo\",\n  ingredients: [\n    {\n      ingredientTitle: \"Aqua\",\n      ingredientRating: 0,\n      ingredientDescription: \"Water; used as a base for formulations.\"\n    }\n  ]\n}\n\n# Notes\n- Ratings should consider new research and credible safety databases.\n- Descriptions must be direct without technical jargon to ensure accessibility to general consumers.\n- Ensure the safety analysis is impartial, based on available scientific information."
                }
              ]
            },
            {
              role: 'user',
              content: `Analyze only the product description and ingredients provided: ${batchText}`,
            },
          ],
          response_format: zodResponseFormat(IngredientAnalysisSchema, 'ingredient_analysis'),
          temperature: 0.1,
          max_tokens: 2000,
        });

        console.log(`Batch completed in ${Date.now() - startTime}ms`);

        const response = completion.choices[0].message.parsed;
        
        // Store scanTitle from first batch only
        if (i === 0) {
          scanTitle = response.scanTitle;
        }
        
        allIngredients = [...allIngredients, ...response.ingredients];
        break;
      } catch (error) {
        console.error('Batch analysis failed:', {
          name: error.name,
          message: error.message,
          status: error?.status,
          type: error?.type,
          code: error?.code,
          attempt: 4 - retryCount,
          batch: i / BATCH_SIZE + 1,
        });

        if (retryCount === 1) {
          throw new Error(`Final attempt failed for batch ${i / BATCH_SIZE + 1}: ${error.message}`);
        }

        retryCount--;
        await delay(retryDelay);
      }
    }
  }

  // Transform all ingredients together with the scanTitle
  const transformedResult = {
    scanTitle,
    ingredients: allIngredients,
  };

  return transformIngredients(transformedResult);
}

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
    console.log('Analysis result:', analysisResult);

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

module.exports = corsMiddleware(withWrapper(handler));