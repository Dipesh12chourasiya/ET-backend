const express = require("express");
const router = express.Router();
const isAuthenticated  = require("../middlewares/isAuth");

const {
  getMonthlySummary,
  getCategoryAnalytics,
  getIncomeExpenseTrend,
} = require("../controllers/analyticsController");

// get monthly summary
router.get("/monthly-summary", isAuthenticated, getMonthlySummary);

// get category analytics
router.get("/category-wise", isAuthenticated, getCategoryAnalytics);

// income expense trend
router.get("/income-expense-trend", isAuthenticated, getIncomeExpenseTrend);

module.exports = router;
