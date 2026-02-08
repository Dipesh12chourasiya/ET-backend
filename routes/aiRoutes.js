const express = require("express");
const router = express.Router();
const { generateMonthlyAIReport } = require("../controllers/aiController");
const authMiddleware = require("../middlewares/isAuth");

router.get("/monthly-report", authMiddleware, generateMonthlyAIReport);

module.exports = router;
