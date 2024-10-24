// /utils/processImage.mjs

import openai from "./openaiClient.mjs";

export const extractTextFromImage = async (imageUrl) => {
  try {
    console.log('Starting extractTextFromImage function');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Corrected model name
      messages: [
        {
          role: "system",
          content: `You specialize in extracting and formatting text. Your primary function is to identify, extract, and reformat text data from images provided, ensuring the output is clear and structured for easy reading and analysis. You prioritize accuracy and maintaining the integrity of the original text while enhancing readability.`,
        },
        {
          role: "user",
          content: `Please extract and format all the text you see in this image.`,
        },
      ],
      max_tokens: 500, // Adjust as needed
      temperature: 0.1, // Lower temperature for more deterministic output
    });

    console.log('Received response from OpenAI for text extraction');
    const assistantMessage = completion.data.choices[0].message.content;
    console.log('Assistant Message:', assistantMessage);

    return { description: assistantMessage };
  } catch (error) {
    console.error('Error in extractTextFromImage:', error);
    throw error; // Handle errors in the calling function
  }
};