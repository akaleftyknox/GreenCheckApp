import openai from "../utils/openaiClient.mjs";

// Function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to handle the OpenAI call with retries
async function analyzeIngredientsWithRetry(extractedText, retries = 3, retryDelay = 2000) {
  while (retries > 0) {
    try {
      console.log('Attempt to analyze ingredients...');
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a Consumer Safety Analyst specialized in analyzing cosmetic and personal care product ingredients. 
            Your task is to:
            1. Identify individual ingredients from the provided list
            2. Rate each ingredient's toxicity on a scale of 0-10 (0 being completely safe, 10 being highly toxic)
            3. Provide a brief description of each ingredient's purpose and any potential health concerns
            
            Be thorough but concise. If you're uncertain about an ingredient, state that explicitly.
            Focus on scientific evidence and reliable sources like EWG's Skin Deep database.`
          },
          {
            role: "user",
            content: `Please analyze these ingredients for safety and toxicity: ${extractedText}`
          }
        ],
        max_tokens: 1000,
        timeout: 60000 // 60 second timeout
      });

      console.log('Analysis completed successfully');
      return completion;
    } catch (error) {
      console.error(`Analysis attempt failed:`, error);
      if (retries === 1) throw error; // Last attempt failed
      console.log(`Retrying in ${retryDelay}ms... (${retries - 1} attempts remaining)`);
      await delay(retryDelay);
      retries--;
    }
  }
}

export default async (req, res) => {
  // Set a longer timeout for the response
  res.setTimeout(120000); // 2 minutes

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.warn('Received non-POST request:', req.method);
    return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
  }

  const { extractedText } = req.body;

  if (!extractedText) {
    console.warn('No extracted text provided in request body:', req.body);
    return res.status(400).json({ error: 'Extracted text is required in the request body.' });
  }

  try {
    console.log('Sending request to OpenAI for ingredient analysis with extracted text:', extractedText);
    
    const completion = await analyzeIngredientsWithRetry(extractedText);
    console.log('OpenAI Completion:', completion.choices[0]);
    const analysisResult = completion.choices[0].message.content;
    res.status(200).json({ analysis: analysisResult });

  } catch (error) {
    console.error('Error while interacting with OpenAI:', error);
    res.status(500).json({ 
      error: 'Failed to analyze ingredients after multiple attempts',
      details: error.message
    });
  }
};