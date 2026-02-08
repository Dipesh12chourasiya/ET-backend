const Transaction = require("../model/Transaction");

exports.getMonthlySummary = async (req, res) => {
  const userId = req.user._id;

  const summary = await Transaction.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ]);

  let income = 0;
  let expense = 0;

  summary.forEach((item) => {
    if (item._id === "income") income = item.total;
    if (item._id === "expense") expense = item.total;
  });

  res.json({
    income,
    expense,
    savings: income - expense,
  });
};

exports.getCategoryAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    const data = await Transaction.aggregate([
      { $match: { user: userId, type: "expense" } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]);

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Category analytics failed" });
  }
};

exports.getMonthlyExpenseTrend = async (req, res) => {
  try {
    const userId = req.user._id;

    const data = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: "expense",
          date: { $exists: true },
        },
      },
      {
        $addFields: {
          month: {
            $month: {
              date: "$date",
              timezone: "Asia/Kolkata",
            },
          },
        },
      },
      {
        $group: {
          _id: { month: "$month" },
          totalExpense: { $sum: "$amount" },
        },
      },
      {
        $sort: { "_id.month": 1 },
      },
    ]);

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Monthly expense trend failed" });
  }
};

