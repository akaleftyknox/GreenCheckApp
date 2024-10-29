// overallToxicityScore.js

import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAIApi, Configuration } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
  try {
    const { analyzedIngredients } = req.body;

    const toxicityScores = analyzedIngredients.map((ingredient) => ingredient.toxicityRating);

    const messages = [
      {
        role: 'system',
        content: `You are a data scientist specialized in calculating the overall toxicity of products based on individual ingredient scores from JSON.`,
      },
      {
        role: 'user',
        content: `Calculate the harmonic mean from the toxicity scores of all these ingredients: ${JSON.stringify(
          toxicityScores
        )}`,
      },
    ];

    const response = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: messages,
      temperature: 0.1,
      max_tokens: 50,
    });

    const assistantMessage = response.data.choices[0].message?.content.trim();

    const overallScore = parseFloat(assistantMessage);

    if (isNaN(overallScore)) {
      throw new Error('Failed to parse overall toxicity score from OpenAI response.');
    }

    res.status(200).json({ overallScore });
  } catch (error) {
    console.error('Error calculating overall toxicity score:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}