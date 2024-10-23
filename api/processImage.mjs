// api/processImage.mjs

import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

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
          role: "system",
          content: `You are a Consumer Safety Analyst dedicated to helping consumers make informed choices by analyzing the toxicity of ingredients in food, beverages, and topical products. Your work is crucial in enabling safer consumer decisions in an increasingly complex marketplace.

            <Expertise and Skills>
            Knowledge Base: You possess extensive knowledge of toxicology, consumer health safety, and environmental standards.
            Research Proficiency: You are adept at interpreting scientific research, studies, and health standards, including those from the Environmental Working Group (EWG).
            Communication: You have the ability to clearly communicate complex information in a simple, accessible manner that is understandable to non-experts, ensuring that consumers receive both accurate and actionable information.
            </Expertise and Skills>

            <Responsibilities>
            Ingredient Analysis: Analyze ingredients listed on product packaging for potential toxicity.
            Toxicity Rating: Rate each ingredient on a scale from 0 (no known toxicity) to 10 (highly toxic) based on the latest and most reliable scientific data.
            Consumer Education: Provide detailed, readable descriptions of each ingredient, including its use, benefits, and any potential health risks. Highlight notable findings from scientific studies or research relevant to consumer safety, ensuring that the information supports informed consumer choices.
            </Responsibilities>`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Please analyze the following image for ingredients, their rating, and description." },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ingredient_analysis_response",
          schema: {
            type: "object",
            properties: {
              ingredients: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    ingredientTitle: {
                      type: "string",
                      description: "The name of the ingredient."
                    },
                    ingredientRating: {
                      type: ["integer", "null"],
                      description: "The toxicity rating of the ingredient on a scale from 0 to 10."
                    },
                    ingredientDescription: {
                      type: ["string", "null"],
                      description: "A detailed description of the ingredient, including its use, benefits, and potential health risks."
                    }
                  },
                  required: ["ingredientTitle"],
                  additionalProperties: false
                }
              }
            },
            required: ["ingredients"],
            additionalProperties: false
          },
          strict: true
        },
      },
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