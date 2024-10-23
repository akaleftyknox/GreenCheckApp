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
    console.warn('Received non-POST request:', req.method);
    return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
  }

  const { imageUrl } = req.body;

  if (!imageUrl) {
    console.warn('No imageUrl provided in request body:', req.body);
    return res.status(400).json({ error: 'Image URL is required in the request body.' });
  }

  try {
    console.log('Sending request to OpenAI with image URL:', imageUrl);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Ensure this model supports vision capabilities
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Please provide a detailed explanation of the following image." },
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

    const assistantMessage = completion.choices[0].message;
    console.log('Received response from OpenAI:', assistantMessage.content);

    // Send the OpenAI response directly to the client
    res.status(200).json({ description: assistantMessage.content });

  } catch (error) {
    if (error.response) {
      // OpenAI API returned an error response
      console.error('OpenAI API Error:', {
        status: error.response.status,
        data: error.response.data,
      });
      res.status(error.response.status).json({ error: error.response.data });
    } else if (error.request) {
      // No response received from OpenAI API
      console.error('No response received from OpenAI API:', error.request);
      res.status(502).json({ error: 'Bad Gateway. No response from OpenAI API.' });
    } else {
      // Other errors
      console.error('Error setting up OpenAI API request:', error.message);
      res.status(500).json({ error: 'Internal Server Error.' });
    }
  }
};