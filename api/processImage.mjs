import openai from "../utils/openaiClient.mjs";

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
        model: "gpt-4o", // Ensure this model supports vision capabilities
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
        max_tokens: 500, // Adjust as needed
      });

      console.log('OpenAI Completion:', completion.choices[0]);
      return completion;  // Return successfully received response
    } catch (error) {
      console.log(`Attempt failed - Retrying in ${retryDelay}ms...`);
      await delay(retryDelay);  // Wait before retrying
      retries -= 1;  // Decrement the retry count
      if (retries === 0) throw error;  // If no retries left, throw the last error
    }
  }
}

export default async (req, res) => {
  // CORS and Method handling remain unchanged...

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