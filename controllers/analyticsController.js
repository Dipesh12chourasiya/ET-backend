const Transaction = require("../model/Transaction");
const PDFDocument = require("pdfkit");
const path = require("path");


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



exports.downloadFilteredReport = async (req, res) => {
  try {
    const { startDate, endDate, type, category } = req.query;

    // ================= BUILD FILTERS =================
    let filters = { user: req.user._id };

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

    // ================= FETCH TRANSACTIONS =================
    const transactions = await Transaction.find(filters).sort({ date: -1 });

    // ================= SUMMARY =================
    const summary = await Transaction.aggregate([
      { $match: filters },
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

    const savings = income - expense;

    // ================= CATEGORY BREAKDOWN =================
    const categoryBreakdown = await Transaction.aggregate([
      { $match: { ...filters, type: "expense" } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
    ]);

    // ================= CREATE PDF =================
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Filtered_Expense_Report.pdf"
    );

    doc.pipe(res);

    // ================= HEADER =================
    doc.rect(0, 0, doc.page.width, 90).fill("#111111");

    // App Name
    doc
      .fillColor("white")
      .fontSize(20)
      .text("Expense Tracker", 90, 30);

    // Branding
    doc
      .fontSize(12)
      .fillColor("#cccccc")
      .text("by Dipesh", 90, 55);

    // Right side date
    doc
      .fontSize(10)
      .fillColor("#cccccc")
      .text(
        `Generated: ${new Date().toDateString()}`,
        doc.page.width - 200,
        40
      );

    // Divider
    doc
      .strokeColor("#cccccc")
      .moveTo(40, 85)
      .lineTo(doc.page.width - 40, 85)
      .stroke();

    doc.moveDown(5);
    doc.fillColor("black");

    // Reset cursor to left margin
    doc.x = doc.page.margins.left;
    doc.y = 110; // or whatever vertical position you want after header
    doc.fillColor("black");

    // ================= FILTERS =================
    doc.fontSize(12).text("Filters Applied:", { underline: true });

    if (startDate)
      doc.text(`Start Date: ${new Date(startDate).toDateString()}`);
    if (endDate)
      doc.text(`End Date: ${new Date(endDate).toDateString()}`);
    if (type) doc.text(`Type: ${type}`);
    if (category && category !== "All")
      doc.text(`Category: ${category}`);

    doc.moveDown(2);

    // ================= SUMMARY =================
    doc.fontSize(16).text("Summary", { underline: true });
    doc.moveDown(1);

    doc.fontSize(12).fillColor("green")
      .text(`Total Income: Rs.${income}`);

    doc.fillColor("red")
      .text(`Total Expense: Rs.${expense}`);

    doc.fillColor("blue")
      .text(`Savings: Rs.${savings}`);

    doc.fillColor("black")
      .text(`Total Transactions: ${transactions.length}`);

    doc.moveDown(2);

    // ================= CATEGORY BREAKDOWN =================
    doc.fontSize(16).text("Category-wise Spending", { underline: true });
    doc.moveDown(1);

    if (categoryBreakdown.length === 0) {
      doc.fontSize(12).text("No category data available.");
    } else {
      categoryBreakdown.forEach((cat) => {
        doc
          .fontSize(12)
          .fillColor("black")
          .text(`${cat._id || "Uncategorized"}: Rs.${cat.total}`);
      });
    }

    doc.moveDown(2);

    // ================= TRANSACTIONS TABLE =================
    doc.fontSize(16).fillColor("black").text("Transactions", {
      underline: true,
    });

    doc.moveDown(1);

    const tableTop = doc.y;
    const col1 = 40;
    const col2 = 150;
    const col3 = 240;
    const col4 = 400;

    // Table Header Background
    doc
      .rect(col1 - 5, tableTop - 5, 500, 20)
      .fill("#000000");

    doc
      .fillColor("white")
      .fontSize(12)
      .text("Date", col1, tableTop)
      .text("Type", col2, tableTop)
      .text("Category", col3, tableTop)
      .text("Amount", col4, tableTop);

    let rowY = tableTop + 25;

    transactions.forEach((tx) => {
      if (rowY > 750) {
        doc.addPage();
        rowY = 40;
      }

      doc
        .fillColor("black")
        .fontSize(10)
        .text(tx.date.toDateString(), col1, rowY)
        .text(tx.type.toUpperCase(), col2, rowY)
        .text(tx.category || "-", col3, rowY)
        .fillColor(tx.type === "income" ? "green" : "red")
        .text(`Rs.${tx.amount}`, col4, rowY);

      rowY += 20;
    });

    // ================= FOOTER =================
    doc
      .fontSize(8)
      .fillColor("gray")
      .text(
        "Expense Tracker Report • Confidential",
        40,
        doc.page.height - 30,
        { align: "center" }
      );

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Filtered PDF generation failed" });
  }
};

