const Transaction = require("../model/Transaction");
const { generateAISummary } = require("../services/aiService");

/* ---------- DATE HELPERS ---------- */
const getMonthRange = (offset = 0) => {
  const start = new Date();
  start.setMonth(start.getMonth() - offset, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return { start, end };
};

/* ---------- DATA QUERIES ---------- */
const getMonthlySummaryData = async (userId, offset = 0) => {
  const { start, end } = getMonthRange(offset);

  const data = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        createdAt: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  let income = 0;
  let expense = 0;

  data.forEach((d) => {
    if (d._id === "income") income = d.total;
    if (d._id === "expense") expense = d.total;
  });

  return { income, expense, savings: income - expense };
};

const getCategoryData = async (userId) => {
  const { start, end } = getMonthRange(0);

  return Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: "expense",
        createdAt: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
      },
    },
  ]);
};

/* ---------- PROMPT ---------- */
const buildAIPrompt = (current, previous, categories) => {
  const expenseChange = previous.expense
    ? (((current.expense - previous.expense) / previous.expense) * 100).toFixed(1)
    : 0;

  return `
You are a financial advisor AI.

Current Month:
Income: ₹${current.income}
Expense: ₹${current.expense}
Savings: ₹${current.savings}

Last Month Expense: ₹${previous.expense}
Expense Change: ${expenseChange}%

Category-wise Expenses:
${categories.map(c => `${c._id}: ₹${c.total}`).join("\n")}

Generate:
1. Spending behavior
2. Comparison with last month
3. Warnings or suggestions

Keep response concise and user-friendly.
`;
};

/* ---------- CONTROLLER ---------- */
exports.generateMonthlyAIReport = async (req, res) => {
  try {
    const userId = req.user._id;

    const current = await getMonthlySummaryData(userId, 0);
    const previous = await getMonthlySummaryData(userId, 1);
    const categories = await getCategoryData(userId);

    const prompt = buildAIPrompt(current, previous, categories);
    const aiReport = await generateAISummary(prompt);

    res.json({ aiReport });
  } catch (err) {
    console.error("AI REPORT ERROR 👉", err.response?.data || err.message);
    res.status(500).json({
      message: "AI report generation failed",
      error: err.response?.data || err.message,
    });
  }
};
