// api/processImage.mjs

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async (req, res) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Replace '*' with your client's domain for better security
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.warn('Received non-POST request');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrl } = req.body;

  if (!imageUrl) {
    console.warn('No imageUrl provided in request body');
    return res.status(400).json({ error: 'Image URL is required' });
  }

  try {
    console.log('Sending request to OpenAI with image URL:', imageUrl);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Ensure this model supports image inputs as per OpenAI's latest documentation
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze the following image and determine if it contains any ingredients." },
            {
              type: "image_url",
              image_url: {
                "url": imageUrl,
              },
            },
          ],
        },
      ],
    });

    console.log(completion.choices[0]);

    const assistantMessage = completion.choices[0].message;
    console.log('Received response from OpenAI:', assistantMessage.content);

    // Simple logic based on the presence of certain keywords
    const ingredientKeywords = ['ingredient', 'ingredients', 'component', 'components', 'substance', 'substances'];

    const ingredientsFound = ingredientKeywords.some(keyword => assistantMessage.content.toLowerCase().includes(keyword));

    if (ingredientsFound) {
      console.log("I found ingredients");
      res.status(200).json({ message: "I found ingredients" });
    } else {
      console.log("I didn't find ingredients");
      res.status(200).json({ message: "I didn't find ingredients" });
    }

  } catch (error) {
    console.error('Error with OpenAI API:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};