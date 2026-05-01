const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(apiKey, prompt) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Anthropic API error: ${response.status} — ${errBody}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * POST /api/ai/analyze
 * AI-powered investment analysis
 */
router.post('/analyze', async (req, res) => {
  try {
    const { apiKey, metrics } = req.body;

    if (!apiKey) return res.status(400).json({ error: 'API key is required' });
    if (!metrics) return res.status(400).json({ error: 'Metrics are required' });

    const prompt = `You are a senior real estate investment advisor. Analyze this property investment (3-4 paragraphs):
- Purchase Price: ${metrics.price}
- Down Payment: ${metrics.downPct} (${metrics.down})
- Monthly Rent: ${metrics.rent} | Monthly Expenses: ${metrics.expenses}
- Net Monthly Cash Flow: ${metrics.netMonthly}
- Annual Cash Flow: ${metrics.annualCf}
- Cash-on-Cash Return: ${metrics.cashOnCash}
- Cap Rate: ${metrics.capRate}
- 10-Year IRR: ${metrics.irr}
- Mortgage Rate: ${metrics.rate} | Appreciation: ${metrics.appreciation}

Provide: 1) Investment attractiveness 2) Key risks 3) Whether to buy/pass and why. Be direct and specific.`;

    const insight = await callClaude(apiKey, prompt);
    res.json({ success: true, insight });
  } catch (err) {
    console.error('AI analyze error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ai/portfolio
 * AI-powered portfolio strategy review
 */
router.post('/portfolio', async (req, res) => {
  try {
    const { apiKey, portfolioSummary } = req.body;

    if (!apiKey) return res.status(400).json({ error: 'API key is required' });
    if (!portfolioSummary) return res.status(400).json({ error: 'Portfolio summary is required' });

    const prompt = `Analyze this real estate portfolio and give strategic recommendations (3 paragraphs):

${portfolioSummary}

Which properties to hold, sell, or expand? What's the portfolio's overall health and recommended next steps?`;

    const insight = await callClaude(apiKey, prompt);
    res.json({ success: true, insight });
  } catch (err) {
    console.error('AI portfolio error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
