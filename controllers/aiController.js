const Transaction = require("../model/Transaction");
const { generateAISummary } = require("../services/aiService");

/* ---------- DATE HELPERS ---------- */
const getMonthRangeFromDate = (baseDate, offset = 0) => {
  const start = new Date(baseDate);
  start.setMonth(start.getMonth() - offset, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return { start, end };
};

/* ---------- DATA QUERIES ---------- */
const getMonthlySummaryData = async (userId, baseDate, offset = 0) => {
  const { start, end } = getMonthRangeFromDate(baseDate, offset);

  const data = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        date: { $gte: start, $lt: end }, // ✅ user-entered date
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

  return {
    income,
    expense,
    savings: income - expense,
  };
};

const getCategoryData = async (userId, baseDate) => {
  const { start, end } = getMonthRangeFromDate(baseDate, 0);

  return Transaction.aggregate([
    {
      $match: {
        user: userId,
        type: "expense",
        date: { $gte: start, $lt: end }, // ✅ correct month, correct date
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
      },
    },
    { $sort: { total: -1 } },
  ]);
};

/* ---------- PROMPT ---------- */
const buildAIPrompt = (current, previous, categories) => {
  const expenseChange =
    previous.expense > 0
      ? (((current.expense - previous.expense) / previous.expense) * 100).toFixed(1)
      : "N/A";

  return `
You are a financial advisor AI.

Current Month:
Income: ₹${current.income}
Expense: ₹${current.expense}
Savings: ₹${current.savings}

Expense Change: ${expenseChange}

Category-wise Expenses:
${categories.map((c) => `${c._id}: ₹${c.total}`).join("\n")}

Generate:
1. Spending behavior
2. Tips for savings
3. Warnings or suggestions

Keep response concise and user-friendly.
`;
};

/* ---------- CONTROLLER ---------- */
exports.generateMonthlyAIReport = async (req, res) => {
  try {
    const userId = req.user._id;

    // 🔥 Anchor report to latest transaction date (NOT system date)
    const latestTransaction = await Transaction.findOne({ user: userId })
      .sort({ date: -1 })
      .select("date");

    if (!latestTransaction) {
      return res.json({
        aiReport: "No transactions found to generate report.",
      });
    }

    const baseDate = latestTransaction.date;

    const current = await getMonthlySummaryData(userId, baseDate, 0);
    const previous = await getMonthlySummaryData(userId, baseDate, 1);
    const categories = await getCategoryData(userId, baseDate);

    const prompt = buildAIPrompt(current, previous, categories);
    const aiReport = await generateAISummary(prompt);

    res.json({ aiReport });
  } catch (err) {
    console.error("AI REPORT ERROR 👉", err.message);
    res.status(500).json({
      message: "AI report generation failed",
      error: err.message,
    });
  }
};