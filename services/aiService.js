const axios = require("axios");

const generateAISummary = async (prompt) => {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "mistralai/mistral-7b-instruct", // FREE
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "ExpenseTrackerAI",
      },
      timeout: 20000,
    }
  );

  return response.data.choices[0].message.content;
};

module.exports = { generateAISummary };
