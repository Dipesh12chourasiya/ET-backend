const axios = require("axios");

const generateAISummary = async (prompt) => {
  try {

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;

  } catch (error) {

    console.log("OPENROUTER ERROR 👉", error.response?.data || error.message);

    throw error;
  }
};

module.exports = { generateAISummary };