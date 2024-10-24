import openai from "../utils/openaiClient.mjs";

export default async (req, res) => {
  // Handle CORS and method filtering
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
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Changed from gpt-4o to gpt-4
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
      max_tokens: 1000
    });

    console.log('OpenAI Completion:', completion.choices[0]);
    const analysisResult = completion.choices[0].message.content;
    res.status(200).json({ analysis: analysisResult });

  } catch (error) {
    console.error('Error while interacting with OpenAI:', error);
    res.status(500).json({ error: 'Internal Server Error. Unable to process request.' });
  }
};