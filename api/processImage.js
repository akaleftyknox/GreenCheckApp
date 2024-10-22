// api/processImage.js

const { Configuration, OpenAIApi } = require("openai");

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    console.warn('Received non-POST request');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrl } = req.body;

  if (!imageUrl) {
    console.warn('No imageUrl provided in request body');
    return res.status(400).json({ error: 'Image URL is required' });
  }

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  try {
    console.log('Sending request to OpenAI with image URL:', imageUrl);
    const response = await openai.createChatCompletion({
      model: "gpt-4", // Ensure the model supports image inputs
      messages: [
        {
          role: "user",
          content: "Analyze the following image and determine if it contains any ingredients.",
        },
        {
          type: "image_url",
          image_url: {
            url: imageUrl,
          },
        },
      ],
    });

    const assistantMessage = response.data.choices[0].message;
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