// api/processImage.mjs

import OpenAI from "openai";
import Ajv from "ajv";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ajv = new Ajv();

const ingredientSchema = {
  type: "object",
  properties: {
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          toxicityRating: { 
            type: "integer", 
            minimum: 0, 
            maximum: 10 
          },
          description: { type: "string" }
        },
        required: ["title", "toxicityRating", "description"],
        additionalProperties: false
      }
    }
  },
  required: ["ingredients"],
  additionalProperties: false
};

const validateSchema = ajv.compile(ingredientSchema);

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
    
    // Step 1: Analyze Image and Extract Ingredients
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06", // Ensure you're using a model that supports vision and structured outputs
      messages: [
        {
          role: "system",
          content: `You are a Consumer Safety Analyst dedicated to helping consumers make informed choices by analyzing the toxicity of ingredients in food, beverages, and topical products. Your work is crucial in enabling safer consumer decisions in an increasingly complex marketplace.

**Expertise and Skills:**

• **Knowledge Base:** You possess extensive knowledge of toxicology, consumer health safety, and environmental standards.
• **Research Proficiency:** You are adept at interpreting scientific research, studies, and health standards, including those from the Environmental Working Group (EWG).
• **Communication:** You have the ability to clearly communicate complex information in a simple, accessible manner that is understandable to non-experts, ensuring that consumers receive both accurate and actionable information.

**Responsibilities:**

1. **Ingredient Analysis:** Analyze ingredients listed on product packaging for potential toxicity.
2. **Toxicity Rating:** Rate each ingredient on a scale from 0 (no known toxicity) to 10 (highly toxic) based on the latest and most reliable scientific data.
3. **Consumer Education:** Provide detailed, readable descriptions of each ingredient, including its use, benefits, and any potential health risks. Highlight notable findings from scientific studies or research relevant to consumer safety, ensuring that the information supports informed consumer choices.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze the following image and extract the list of ingredients." },
            {
              type: "image_url",
              image_url: {
                "url": imageUrl,
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ingredient_analysis_response",
          schema: ingredientSchema,
          strict: true
        }
      },
      max_tokens: 500,
    });

    console.log('OpenAI Completion:', completion.choices[0]);

    const assistantMessage = completion.choices[0].message;
    console.log('Received response from OpenAI:', assistantMessage.content);

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(assistantMessage.content);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      return res.status(500).json({ error: 'Failed to parse response from OpenAI' });
    }

    // Validate the response against the JSON schema
    const valid = validateSchema(parsedResponse);

    if (!valid) {
      console.error('Response does not match schema:', validateSchema.errors);
      return res.status(500).json({ error: 'Invalid response format from OpenAI' });
    }

    // Step 2: Analyze Each Ingredient for Toxicity
    const ingredients = parsedResponse.ingredients;

    // Function to analyze toxicity of a single ingredient
    const analyzeToxicity = async (ingredient) => {
      const toxicityCompletion = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages: [
          {
            role: "system",
            content: `You are a Consumer Safety Analyst specializing in the toxicity of ingredients in consumer products.`,
          },
          {
            role: "user",
            content: `Provide a toxicity rating and description for the ingredient "${ingredient.title}".`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "toxicity_analysis",
            schema: {
              type: "object",
              properties: {
                toxicityRating: { 
                  type: "integer", 
                  minimum: 0, 
                  maximum: 10 
                },
                description: { type: "string" }
              },
              required: ["toxicityRating", "description"],
              additionalProperties: false
            },
            strict: true
          }
        },
        max_tokens: 300,
      });

      const toxicityMessage = toxicityCompletion.choices[0].message;
      let toxicityData;
      try {
        toxicityData = JSON.parse(toxicityMessage.content);
      } catch (error) {
        console.error(`Failed to parse toxicity data for ${ingredient.title}:`, error);
        toxicityData = {
          toxicityRating: null,
          description: "Toxicity data unavailable."
        };
      }

      return {
        ...ingredient,
        toxicityRating: toxicityData.toxicityRating || 0,
        description: toxicityData.description || "No description available."
      };
    };

    // Analyze toxicity for all ingredients in parallel
    const analyzedIngredients = await Promise.all(ingredients.map(analyzeToxicity));

    // Construct the final response
    const finalResponse = {
      ingredients: analyzedIngredients
    };

    // Optionally, validate the final response again
    const finalValid = validateSchema(finalResponse);
    if (!finalValid) {
      console.error('Final response does not match schema:', validateSchema.errors);
      return res.status(500).json({ error: 'Invalid final response format' });
    }

    // Send the response to the client
    res.status(200).json(finalResponse);

  } catch (error) {
    console.error('Error with OpenAI API:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};