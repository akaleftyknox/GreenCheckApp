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
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert in analyzing product packaging images to identify and evaluate ingredients based on health and environmental impact. Your tasks are:
1. **Identify Ingredients**: Accurately extract a list of all visible ingredients from the product's packaging.
2. **Analyze Ingredients**: Provide a detailed health analysis for each identified ingredient, referencing credible sources like the Environmental Working Group (EWG). Include both benefits and potential risks.
3. **Toxicity Scoring**: Assign a toxicity score from 0 to 10 for each ingredient, where 0 is non-toxic and 10 is highly toxic, based on scientific data.
4. **Educate Users**: Deliver detailed, user-friendly information about each ingredient, including regulatory status and common uses. Empower consumers with actionable advice to make informed decisions.`,
        },
        {
          role: "user",
          content: "I have no listed or known allergies and I’m not sure if I have any. Please don’t take this into account."
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ingredients_schema",
          schema: {
            type: "object",
            properties: {
              ingredients: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: {
                      type: "string",
                      description: "The name of the ingredient."
                    },
                    toxicityRating: {
                      type: "number",
                      minimum: 0,
                      maximum: 10,
                      description: "The toxicity rating of the ingredient."
                    },
                    description: {
                      type: "string",
                      description: "A detailed health analysis of the ingredient."
                    }
                  },
                  required: ["title", "toxicityRating", "description"],
                  additionalProperties: false
                }
              }
            },
            required: ["ingredients"],
            additionalProperties: false
          }
        }
      }
    });

    // Log completion result
    console.log('Received response from OpenAI:', completion);

    // Check if the response has ingredients
    if (!completion || !completion.choices || completion.choices.length === 0 || !completion.choices[0].message || completion.choices[0].message.trim() === "") {
      console.error('No ingredients found or no response from OpenAI.');
      res.status(404).json({ error: 'No ingredients found', ingredients: [] });
    } else {
      const ingredients = JSON.parse(completion.choices[0].message);
      if (ingredients.ingredients.length > 0) {
        console.log('Ingredients found:', ingredients);
        res.status(200).json(ingredients);
      } else {
        console.log('No ingredients found in the product.');
        res.status(404).json({ error: 'No ingredients found', ingredients: [] });
      }
    }
  } catch (error) {
    console.error('Error during OpenAI API request:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};