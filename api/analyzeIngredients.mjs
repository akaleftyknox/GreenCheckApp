import openai from "../utils/openaiClient.mjs";
import { ingredientAnalysisFormat } from "../utils/schemas.mjs";

export const maxDuration = 60;

async function analyzeIngredientsWithRetry(extractedText, retries = 3) {
  console.log('Starting analysis with OpenAI configuration:', {
    timeout: openai.timeout,
    maxRetries: openai.maxRetries
  });

  while (retries > 0) {
    try {
      console.log(`Attempt ${4 - retries}: Sending request to OpenAI`);
      const startTime = Date.now();
      
      const completion = await openai.beta.chat.completions.parse({
        model: "gpt-4o-2024-08-06",
        messages: [
          {
            role: "system",
            content: `You are a Consumer Safety Analyst specializing in cosmetic ingredients analysis. 
            For each ingredient provided:
            - Extract the ingredient name as ingredientTitle
            - Rate its safety from 0-10 (0 safest, 10 most toxic) as ingredientRating
            - Provide a brief description of its purpose and any safety concerns as ingredientDescription`
          },
          {
            role: "user",
            content: `Analyze these ingredients: ${extractedText}`
          }
        ],
        response_format: ingredientAnalysisFormat,
        temperature: 0.3,
        max_tokens: 500
      });

      console.log(`OpenAI request completed in ${Date.now() - startTime}ms`);
      return completion;

    } catch (error) {
      const errorDetails = {
        name: error.name,
        message: error.message,
        status: error?.status,
        type: error?.type,
        code: error?.code,
        attempt: 4 - retries
      };
      
      console.error('OpenAI request failed:', errorDetails);
      
      if (retries === 1) {
        throw new Error(`Final attempt failed: ${error.message}`);
      }
      
      retries--;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
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
    
    // Check for refusal
    const response = completion.choices[0].message;
    if (response.refusal) {
      return res.status(400).json({
        error: 'Analysis refused',
        details: response.refusal,
        timestamp: new Date().toISOString()
      });
    }
    
    // Return parsed structured data
    res.status(200).json({ 
      analysis: response.parsed,
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