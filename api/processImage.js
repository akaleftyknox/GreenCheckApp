const openai = require("../utils/openaiClient.js");
const corsMiddleware = require("../utils/corsMiddleware.js");

// Function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to handle the OpenAI call with retries
async function callOpenAIWithRetry(imageUrl, retries = 3, retryDelay = 2000) {
  while (retries > 0) {
    try {
      console.log('Sending request to OpenAI with image URL:', imageUrl);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Correct model name
        messages: [
          {
            role: "system",
            content: `You specialize in extracting and formatting text. Your primary function is to identify, extract, and reformat text data from images provided, ensuring the output is clear and structured for easy reading and analysis. You prioritize accuracy and maintaining the integrity of the original text while enhancing readability.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Please extract and format all the text you see in this image." },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      console.log('OpenAI Completion:', completion.choices[0]);
      return completion;
    } catch (error) {
      console.log(`Attempt failed - Retrying in ${retryDelay}ms...`);
      await delay(retryDelay);
      retries -= 1;
      if (retries === 0) throw error;
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
    console.warn('Received non-POST request:', req.method);
    return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
  }

  const { imageUrl } = req.body;

  if (!imageUrl) {
    console.warn('No imageUrl provided in request body:', req.body);
    return res.status(400).json({ error: 'Image URL is required in the request body.' });
  }

  try {
    const completion = await callOpenAIWithRetry(imageUrl);
    const assistantMessage = completion.choices[0].message;
    console.log('Received response from OpenAI:', assistantMessage.content);
    res.status(200).json({ description: assistantMessage.content });
  } catch (error) {
    console.error('Failed after retries:', error);
    res.status(500).json({ error: 'Failed to process image after several attempts.' });
  }
};

// Export the wrapped handler with CORS middleware
module.exports = {
  default: corsMiddleware(withWrapper(handler))
};