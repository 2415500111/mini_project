/**
 * Real Estate Investment Calculation Utilities
 * Ported from Python (real_estate_tool.py) to JavaScript
 */

function fmtUsd(n) {
  if (n < 0) return `-$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtPct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

/**
 * Core financial metrics calculator
 * @param {Object} params - Investment parameters
 * @returns {Object} All computed metrics and 10-year projection
 */
function calcMetrics({ price, downPct, rate, years, rent, expenses, appreciation, vacancyRate }) {
  const down = price * downPct;
  const loan = price - down;
  const monthlyRate = rate / 12;
  const n = years * 12;

  let mortgage;
  if (monthlyRate === 0) {
    mortgage = loan / n;
  } else {
    mortgage = loan * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
  }

  const effectiveRent = rent * (1 - vacancyRate);
  const netMonthly = effectiveRent - expenses - mortgage;
  const annualCf = netMonthly * 12;
  const cashOnCash = down > 0 ? annualCf / down : 0;
  const capRate = price > 0 ? ((effectiveRent - expenses) * 12) / price : 0;

  // IRR calculation using Newton-Raphson method
  const cashFlows = [-down];
  for (let y = 1; y <= 10; y++) {
    const rentY = effectiveRent * Math.pow(1.02, y - 1);
    const expY = expenses * Math.pow(1.03, y - 1);
    let cf = (rentY - expY - mortgage) * 12;
    if (y === 10) {
      const salePrice = price * Math.pow(1 + appreciation, 10);
      const remaining = loan * (Math.pow(1 + monthlyRate, n) - Math.pow(1 + monthlyRate, y * 12)) / (Math.pow(1 + monthlyRate, n) - 1);
      cashFlows.push(cf + salePrice - remaining);
    } else {
      cashFlows.push(cf);
    }
  }

  let irr = 0.10;
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + irr, t);
      dnpv += -t * cashFlows[t] / Math.pow(1 + irr, t + 1);
    }
    if (Math.abs(dnpv) < 1e-10) break;
    irr -= npv / dnpv;
    if (Math.abs(npv) < 0.01) break;
  }

  // 10-year projection
  const projection = [];
  for (let y = 0; y <= 10; y++) {
    const propVal = price * Math.pow(1 + appreciation, y);
    let equity;
    if (y === 0) {
      equity = down;
    } else {
      const remaining = loan * (Math.pow(1 + monthlyRate, n) - Math.pow(1 + monthlyRate, y * 12)) / (Math.pow(1 + monthlyRate, n) - 1);
      equity = propVal - remaining;
    }
    const rentY = effectiveRent * Math.pow(1.02, y);
    const expY = expenses * Math.pow(1.03, y);
    const cfY = (rentY - expY - mortgage) * 12;
    projection.push({
      year: `Y${y}`,
      propertyValue: Math.round(propVal),
      equity: Math.round(equity),
      annualCashFlow: Math.round(cfY),
      rentalIncome: Math.round(rentY * 12),
    });
  }

  return {
    mortgage,
    netMonthly,
    annualCf,
    cashOnCash,
    capRate,
    irr,
    down,
    loan,
    projection,
  };
}

/**
 * Compute investment score (1-99)
 */
function investmentScore(m) {
  const score = 50 + m.cashOnCash * 400 + m.capRate * 300 + m.irr * 100;
  return Math.max(1, Math.min(99, Math.round(score)));
}

module.exports = { fmtUsd, fmtPct, calcMetrics, investmentScore };
