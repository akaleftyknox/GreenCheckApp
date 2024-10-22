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
      model: "gpt-4o", // Updated model name; ensure it's correct
      messages: [
        {
          role: "system",
          content: `You are an expert in analyzing product packaging images to identify and evaluate ingredients based on health and environmental impact. Your tasks are:
1. **Identify Ingredients**: Accurately extract a list of all visible ingredients from the product's packaging.
2. **Analyze Ingredients**: Provide a detailed health analysis for each identified ingredient, referencing credible sources like the Environmental Working Group (EWG). Include both benefits and potential risks.
3. **Toxicity Scoring**: Assign a toxicity score from 0 to 10 for each ingredient, where 0 indicates non-toxic and 10 indicates highly toxic, based on scientific data.
4. **Educate Users**: Deliver detailed, user-friendly information about each ingredient, including regulatory status and common uses. Empower consumers with actionable advice to make informed decisions about what they put on or in themselves.

The response should be in JSON format with the following structure:

{
  "ingredients": [
    {
      "title": "Ingredient Name",
      "toxicityRating": 0-10,
      "description": "Detailed analysis of the ingredient's effects."
    },
    ...
  ]
}
`,
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

    // Access the 'content' property correctly
    const assistantMessage = completion.choices[0].message.content;
    console.log('Received response content from OpenAI:', assistantMessage);

    // Check if the response has content
    if (!assistantMessage || assistantMessage.trim() === "") {
      console.error('No ingredients found or no response from OpenAI.');
      res.status(404).json({ error: 'No ingredients found', ingredients: [] });
      return;
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(assistantMessage);
      console.log('Parsed JSON response successfully.');
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError.message);
      return res.status(500).json({ error: 'Failed to parse response from OpenAI' });
    }

    // Validate JSON structure based on schema
    if (
      !parsedResponse.ingredients ||
      !Array.isArray(parsedResponse.ingredients) ||
      parsedResponse.ingredients.some(
        ingredient =>
          typeof ingredient.title !== 'string' ||
          typeof ingredient.toxicityRating !== 'number' ||
          typeof ingredient.description !== 'string'
      )
    ) {
      console.error('Invalid JSON structure:', parsedResponse);
      return res.status(500).json({ error: 'Invalid response format from OpenAI' });
    }

    // Determine if any ingredients were found
    const ingredientsFound = parsedResponse.ingredients.length > 0;

    if (ingredientsFound) {
      console.log('Ingredients found:', parsedResponse.ingredients);
      res.status(200).json(parsedResponse);
    } else {
      console.log("I didn't find ingredients");
      res.status(200).json({ message: "I didn't find ingredients" });
    }
  } catch (error) {
    console.error('Error during OpenAI API request:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};