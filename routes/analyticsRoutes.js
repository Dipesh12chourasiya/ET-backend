const express = require("express");
const router = express.Router();
const isAuthenticated  = require("../middlewares/isAuth");

const {
  getMonthlySummary,
  getCategoryAnalytics,
  getMonthlyExpenseTrend,
  downloadFilteredReport,
} = require("../controllers/analyticsController");

// get monthly summary
router.get("/monthly-summary", isAuthenticated, getMonthlySummary);

// get category analytics
router.get("/category-wise", isAuthenticated, getCategoryAnalytics);

// income expense trend
router.get("/monthly-expense-trend", isAuthenticated, getMonthlyExpenseTrend);

// download report
router.get("/download-filtered-report", isAuthenticated, downloadFilteredReport);

module.exports = router;
