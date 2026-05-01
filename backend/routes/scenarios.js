const express = require('express');
const router = express.Router();
const { calcMetrics, investmentScore } = require('../utils/calculations');

/**
 * POST /api/scenarios
 * Accepts base property params, returns bull/base/bear scenario metrics
 */
router.post('/', (req, res) => {
  try {
    const { price, downPct, rate, years, rent, expenses, appreciation, vacancyRate } = req.body;

    const scenarios = {
      '🚀 Bull Case': { appreciation: 0.07, vacancyRate: 0.02, rate: 0.065 },
      '📊 Base Case': { appreciation, vacancyRate, rate },
      '🐻 Bear Case': { appreciation: 0.01, vacancyRate: 0.12, rate: 0.085 },
    };

    const results = {};
    for (const [name, overrides] of Object.entries(scenarios)) {
      const m = calcMetrics({
        price,
        downPct,
        rate: overrides.rate,
        years,
        rent,
        expenses,
        appreciation: overrides.appreciation,
        vacancyRate: overrides.vacancyRate,
      });
      results[name] = {
        annualCf: m.annualCf,
        capRate: m.capRate,
        cashOnCash: m.cashOnCash,
        irr: m.irr,
        netMonthly: m.netMonthly,
        score: investmentScore(m),
      };
    }

    res.json({ success: true, scenarios: results });
  } catch (err) {
    console.error('Scenarios error:', err);
    res.status(500).json({ error: 'Scenario calculation error' });
  }
});

module.exports = router;
