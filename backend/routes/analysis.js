const express = require('express');
const router = express.Router();
const { calcMetrics, investmentScore } = require('../utils/calculations');

/**
 * POST /api/analyze
 * Accepts property parameters, returns full metrics + score + projection
 */
router.post('/', (req, res) => {
  try {
    const { price, downPct, rate, years, rent, expenses, appreciation, vacancyRate } = req.body;

    // Validate required fields
    if ([price, downPct, rate, years, rent, expenses, appreciation, vacancyRate].some(v => v === undefined || v === null)) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const metrics = calcMetrics({ price, downPct, rate, years, rent, expenses, appreciation, vacancyRate });
    const score = investmentScore(metrics);

    res.json({
      success: true,
      metrics: {
        mortgage: metrics.mortgage,
        netMonthly: metrics.netMonthly,
        annualCf: metrics.annualCf,
        cashOnCash: metrics.cashOnCash,
        capRate: metrics.capRate,
        irr: metrics.irr,
        down: metrics.down,
        loan: metrics.loan,
      },
      score,
      projection: metrics.projection,
    });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'Calculation error' });
  }
});

module.exports = router;
