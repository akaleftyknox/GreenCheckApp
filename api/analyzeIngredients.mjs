import openai from "../utils/openaiClient.mjs";
import { ingredientAnalysisFormat } from "../utils/schemas.mjs";
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 60;

function transformIngredients(openAIIngredients) {
  return openAIIngredients
    .filter(ing => ing.ingredientTitle && ing.ingredientRating !== null && ing.ingredientDescription)
    .map(ing => ({
      id: uuidv4(),
      title: ing.ingredientTitle,
      toxicityRating: ing.ingredientRating,
      description: ing.ingredientDescription
    }));
}

async function analyzeIngredientsWithRetry(extractedText, retries = 3) {
  console.log('Starting analysis with OpenAI configuration:', {
    timeout: openai.timeout,
    maxRetries: openai.maxRetries
  });

  // Split ingredients into a list
  const ingredientsList = extractedText
    .split(',')
    .map(i => i.trim())
    .filter(i => i.length > 0);

  const BATCH_SIZE = 5; // Process 5 ingredients at a time
  let allIngredients = [];

  // Process ingredients in batches
  for (let i = 0; i < ingredientsList.length; i += BATCH_SIZE) {
    const batchIngredients = ingredientsList.slice(i, i + BATCH_SIZE);
    const batchText = batchIngredients.join(', ');

    let retryCount = retries;
    while (retryCount > 0) {
      try {
        console.log(`Analyzing batch ${i/BATCH_SIZE + 1}, attempt ${4 - retryCount}`);
        const startTime = Date.now();
        
        const completion = await openai.beta.chat.completions.parse({
          model: "gpt-4o-2024-08-06",
          messages: [
            {
              role: "system",
              content: `You are a Consumer Safety Analyst. For each ingredient, provide:
              - The exact ingredient name as ingredientTitle
              - A safety rating (0-10, 0 safest) as ingredientRating
              - A brief, concise description as ingredientDescription
              Be concise but accurate.`
            },
            {
              role: "user",
              content: `Analyze these ingredients: ${batchText}`
            }
          ],
          response_format: ingredientAnalysisFormat,
          temperature: 0.1,
          max_tokens: 1000
        });

        console.log(`Batch completed in ${Date.now() - startTime}ms`);
        
        // Extract ingredients from this batch and add to overall list
        const response = completion.choices[0].message;
        if (response.refusal) {
          throw new Error(`Analysis refused: ${response.refusal}`);
        }
        
        allIngredients = [...allIngredients, ...response.parsed.ingredients];
        break; // Success, exit retry loop

      } catch (error) {
        const errorDetails = {
          name: error.name,
          message: error.message,
          status: error?.status,
          type: error?.type,
          code: error?.code,
          attempt: 4 - retryCount,
          batch: i/BATCH_SIZE + 1
        };
        
        console.error('Batch analysis failed:', errorDetails);
        
        if (retryCount === 1) {
          throw new Error(`Final attempt failed for batch ${i/BATCH_SIZE + 1}: ${error.message}`);
        }
        
        retryCount--;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // Transform all ingredients to component format
  const transformedIngredients = transformIngredients(allIngredients);

  return {
    choices: [{
      message: {
        parsed: {
          ingredients: transformedIngredients
        }
      }
    }]
  };
}

export default async (req, res) => {
  console.log('Request received:', {
    method: req.method,
    headers: req.headers,
    bodyLength: req.body ? JSON.stringify(req.body).length : 0
  });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    
    const completion = await analyzeIngredientsWithRetry(extractedText);
    
    console.log(`Analysis completed in ${Date.now() - startTime}ms`);
    
    res.status(200).json({ 
      analysis: {
        ingredients: completion.choices[0].message.parsed.ingredients
      },
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('Fatal error in ingredient analysis:', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Analysis failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};