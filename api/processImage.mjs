import openai from "../utils/openaiClient.mjs";

export const extractTextFromImage = async (imageUrl) => {
  try {
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

    const assistantMessage = completion.choices[0].message.content;
    return { description: assistantMessage };
  } catch (error) {
    throw error; // Handle errors in the calling function
  }
};