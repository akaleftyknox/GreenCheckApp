const { Configuration, OpenAIApi } = require('openai');
const { v4: uuidv4 } = require('uuid');
const { ingredientAnalysisFormat } = require("../utils/schemas.js");

// Initialize OpenAI API client
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY, // Ensure this is set
});
const openai = new OpenAIApi(configuration);

// CORS Middleware
const allowCors = fn => async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust as needed
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Call the actual handler
  try {
    return await fn(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

const maxDuration = 60;

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

        const completion = await openai.createChatCompletion({
          model: "gpt-4", // Corrected model name
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

        const response = completion.data.choices[0].message;
        if (response.refusal) {
          throw new Error(`Analysis refused: ${response.refusal}`);
        }

        allIngredients = [...allIngredients, ...response.parsed.ingredients];
        break;

      } catch (error) {
        const errorDetails = {
          name: error.name,
          message: error.message,
          status: error?.status,
          type: error?.type,
          code: error?.code,
          attempt: 4 - retryCount,
          batch: i / BATCH_SIZE + 1
        };

        console.error('Batch analysis failed:', errorDetails);

        if (retryCount === 1) {
          throw new Error(`Final attempt failed for batch ${i / BATCH_SIZE + 1}: ${error.message}`);
        }

        retryCount--;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

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

const handler = async (req, res) => {
  console.log('Request received:', {
    method: req.method,
    headers: req.headers,
    bodyLength: req.body ? JSON.stringify(req.body).length : 0
  });

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

// Export the wrapped handler with CORS and maxDuration
module.exports = {
  default: allowCors(handler),
  maxDuration
};
