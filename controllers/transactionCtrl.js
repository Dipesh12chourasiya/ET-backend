const asyncHandler = require("express-async-handler");
const Transaction = require("../model/Transaction");

const transactionController = {
  // ================= CREATE =================
  create: asyncHandler(async (req, res) => {
    const { type, category, amount, date, description } = req.body;

    if (!amount || !type || !date) {
      return res
        .status(400)
        .json({ message: "Type, amount and date are required" });
    }

    const transaction = await Transaction.create({
      user: req.user.id,
      type,
      category,
      amount,
      date,
      description,
    });

    res.status(201).json(transaction);
  }),

  // ================= LISTS =================
  getFilteredTransactions: asyncHandler(async (req, res) => {
    const { startDate, endDate, type, category } = req.query;

    let filters = { user: req.user.id };

    if (startDate) {
      filters.date = { ...filters.date, $gte: new Date(startDate) };
    }
    if (endDate) {
      filters.date = { ...filters.date, $lte: new Date(endDate) };
    }
    if (type) {
      filters.type = type;
    }
    if (category && category !== "All") {
      filters.category = category;
    }

    const transactions = await Transaction.find(filters).sort({ date: -1 });
    res.json(transactions);
  }),

  // ================= UPDATE =================
  update: asyncHandler(async (req, res) => {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (transaction.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    transaction.type = req.body.type || transaction.type;
    transaction.category = req.body.category || transaction.category;
    transaction.amount = req.body.amount || transaction.amount;
    transaction.date = req.body.date || transaction.date;
    transaction.description =
      req.body.description || transaction.description;

    const updatedTransaction = await transaction.save();
    res.json(updatedTransaction);
  }),

  // ================= DELETE =================
  delete: asyncHandler(async (req, res) => {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (transaction.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await transaction.deleteOne();
    res.json({ message: "Transaction removed" });
  }),
};

module.exports = transactionController;
