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
            "content": [
              {
                "type": "text",
                "text": "Extract and analyze the text data from the provided image, focusing on identifying the product and capturing the ingredients list while ensuring no other unnecessary text is included.\n\nPay particular attention to accurately capturing the ingredient list in its original order, formatting it clearly, and excluding any text that follows the phrase \"made without.\"\n\n# Steps\n\n1. **Product Identification**: Identify the product name or title if visible in the image.\n2. **Ingredients Extraction**: Extract the ingredients list. Ensure that:\n   - Ingredients are captured in the correct order.\n   - The textual data is formatted in a clean, readable manner.\n   - Avoid extracting or including any text that follows \"made without.\"\n3. **Organization**: Present the result in a structured way that is easy to interpret.\n\n# Output Format\n\nProvide a structured JSON output in the following format:\n- **product_name**: The name of the product, if identifiable.\n- **ingredients_list**: List of ingredients captured from the image.\n  - Maintain the original order in a comma-separated string list.\n\nExample format:\n\n```json\n{\n  \"product_name\": \"[Product Name]\",\n  \"ingredients_list\": \"[Ingredient 1, Ingredient 2, Ingredient 3, ...]\"\n}\n```\n\n# Notes\n\n- Pay special attention to formatting the ingredients list clearly and maintaining the original sequence.\n- Avoid including any phrases or words that come after \"made without\" even if they appear elsewhere in the text.\n- If any text cannot be confidently recognized, mark it as `[unreadable text]`."
              }
            ]
          },
          {
            "role": "user",
            "content": [
              {
                "type": "image_url",
                "image_url": {
                  url: imageUrl,
                },
              }
            ]
          },
        ],
        temperature: 0,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
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