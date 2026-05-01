const express = require('express');
const router = express.Router();
const { calcMetrics, investmentScore, fmtUsd, fmtPct } = require('../utils/calculations');

const PORTFOLIO = [
  { name: 'Downtown Condo',    price: 420000, rent: 2800, expenses: 650,  downPct: 0.20, rate: 0.070, appreciation: 0.045, vacancyRate: 0.04, years: 30 },
  { name: 'Suburban House',    price: 380000, rent: 2400, expenses: 550,  downPct: 0.25, rate: 0.068, appreciation: 0.035, vacancyRate: 0.06, years: 30 },
  { name: 'Multi-Family Unit', price: 780000, rent: 5200, expenses: 1200, downPct: 0.30, rate: 0.075, appreciation: 0.050, vacancyRate: 0.08, years: 30 },
];

/**
 * GET /api/portfolio
 * Returns portfolio data with computed metrics for each property
 */
router.get('/', (req, res) => {
  try {
    const rows = PORTFOLIO.map(p => {
      const m = calcMetrics(p);
      return {
        name: p.name,
        price: p.price,
        priceFormatted: fmtUsd(p.price),
        down: m.down,
        downFormatted: fmtUsd(m.down),
        netMonthly: m.netMonthly,
        netMonthlyFormatted: fmtUsd(m.netMonthly),
        capRate: m.capRate,
        capRateFormatted: fmtPct(m.capRate),
        cashOnCash: m.cashOnCash,
        cashOnCashFormatted: fmtPct(m.cashOnCash),
        irr: m.irr,
        irrFormatted: fmtPct(m.irr),
        annualCf: m.annualCf,
        annualCfFormatted: fmtUsd(m.annualCf),
        score: investmentScore(m),
      };
    });

    const totalDown = rows.reduce((s, r) => s + r.down, 0);
    const totalCf = rows.reduce((s, r) => s + r.annualCf, 0);
    const avgIrr = rows.reduce((s, r) => s + r.irr, 0) / rows.length;

    res.json({
      success: true,
      properties: rows,
      summary: {
        totalDown,
        totalDownFormatted: fmtUsd(totalDown),
        totalCf,
        totalCfFormatted: fmtUsd(totalCf),
        avgIrr,
        avgIrrFormatted: fmtPct(avgIrr),
        count: rows.length,
      },
    });
  } catch (err) {
    console.error('Portfolio error:', err);
    res.status(500).json({ error: 'Portfolio calculation error' });
  }
});

module.exports = router;
