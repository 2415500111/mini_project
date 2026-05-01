/**
 * Chart.js rendering module — all charts for the Real Estate AI Platform
 * Uses dark theme styling consistent with the design system
 */

const CHART_COLORS = {
  gold: '#c8a96e',
  goldAlpha: 'rgba(200,169,110,0.15)',
  green: '#4ade80',
  red: '#f87171',
  purple: '#818cf8',
  purpleAlpha: 'rgba(129,140,248,0.12)',
  teal: '#22d3ee',
  emerald: '#34d399',
  pink: '#f472b6',
  grid: '#1e1e1e',
  text: '#888',
  bg: '#111',
};

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: CHART_COLORS.text, font: { family: "'DM Sans', sans-serif", size: 11 } } },
    tooltip: { backgroundColor: '#1a1a1a', titleColor: '#f5f5f5', bodyColor: '#ccc', borderColor: '#2a2a2a', borderWidth: 1 },
  },
  scales: {
    x: { ticks: { color: CHART_COLORS.text }, grid: { color: CHART_COLORS.grid } },
    y: { ticks: { color: CHART_COLORS.text }, grid: { color: CHART_COLORS.grid } },
  },
};

// Store chart instances for cleanup
const chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function fmtDollar(v) {
  if (v < 0) return `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/* ── Radar Chart: Investment Health ──────────────────── */
function renderRadarChart(canvasId, metrics, projection) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const price = projection[0] ? (projection[0].propertyValue || 0) : 0;
  const equity10 = projection[10] ? projection[10].equity : 0;

  const values = [
    Math.min(100, Math.max(0, 50 + metrics.annualCf / 500)),
    Math.min(100, metrics.capRate * 1000),
    Math.min(100, metrics.irr * 300),
    Math.min(100, metrics.cashOnCash * 500),
    Math.min(100, price > 0 ? (equity10 / price) * 50 : 0),
  ];

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Cash Flow', 'Cap Rate', 'IRR', 'CoC Return', 'Equity Build'],
      datasets: [{
        data: values,
        backgroundColor: CHART_COLORS.goldAlpha,
        borderColor: CHART_COLORS.gold,
        borderWidth: 2,
        pointBackgroundColor: CHART_COLORS.gold,
        pointBorderColor: '#0a0a0a',
        pointBorderWidth: 2,
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          beginAtZero: true, max: 100,
          ticks: { color: '#444', backdropColor: 'transparent', stepSize: 25 },
          grid: { color: '#2a2a2a' },
          angleLines: { color: '#2a2a2a' },
          pointLabels: { color: '#888', font: { size: 11, family: "'DM Sans', sans-serif" } },
        },
      },
    },
  });
}

/* ── Horizontal Bar: Cash Flow Breakdown ─────────────── */
function renderBreakdownChart(canvasId, effectiveRent, expenses, mortgage, netMonthly) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = ['Effective Rent', 'Operating Expenses', 'Mortgage Payment', 'Net Cash Flow'];
  const data = [Math.round(effectiveRent), -Math.round(expenses), -Math.round(mortgage), Math.round(netMonthly)];
  const colors = [CHART_COLORS.emerald, CHART_COLORS.red, CHART_COLORS.pink, netMonthly >= 0 ? CHART_COLORS.green : CHART_COLORS.red];

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderRadius: 4 }],
    },
    options: {
      ...CHART_DEFAULTS,
      indexAxis: 'y',
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
      scales: {
        x: { ...CHART_DEFAULTS.scales.x, ticks: { ...CHART_DEFAULTS.scales.x.ticks, callback: v => fmtDollar(v) } },
        y: { ...CHART_DEFAULTS.scales.y },
      },
    },
  });
}

/* ── Area Chart: Property Value & Equity ─────────────── */
function renderValueEquityChart(canvasId, projection) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labels = projection.map(p => p.year);
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Property Value', data: projection.map(p => p.propertyValue),
          borderColor: CHART_COLORS.gold, backgroundColor: CHART_COLORS.goldAlpha,
          fill: true, borderWidth: 2.5, tension: 0.3, pointRadius: 3, pointBackgroundColor: CHART_COLORS.gold,
        },
        {
          label: 'Equity', data: projection.map(p => p.equity),
          borderColor: CHART_COLORS.purple, backgroundColor: CHART_COLORS.purpleAlpha,
          fill: true, borderWidth: 2.5, tension: 0.3, pointRadius: 3, pointBackgroundColor: CHART_COLORS.purple,
        },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: { ...CHART_DEFAULTS.plugins },
      scales: {
        x: CHART_DEFAULTS.scales.x,
        y: { ...CHART_DEFAULTS.scales.y, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => fmtDollar(v) } },
      },
    },
  });
}

/* ── Bar Chart: Annual Cash Flow ─────────────────────── */
function renderAnnualCfChart(canvasId, projection) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const data = projection.slice(1);
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(p => p.year),
      datasets: [{
        label: 'Annual Cash Flow',
        data: data.map(p => p.annualCashFlow),
        backgroundColor: data.map(p => p.annualCashFlow >= 0 ? CHART_COLORS.green : CHART_COLORS.red),
        borderRadius: 4,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
      scales: {
        x: CHART_DEFAULTS.scales.x,
        y: { ...CHART_DEFAULTS.scales.y, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => fmtDollar(v) } },
      },
    },
  });
}

/* ── Bar Chart: Annual Rental Income ─────────────────── */
function renderRentalIncomeChart(canvasId, projection) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const data = projection.slice(1);
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(p => p.year),
      datasets: [{
        label: 'Rental Income',
        data: data.map(p => p.rentalIncome),
        backgroundColor: CHART_COLORS.emerald,
        borderRadius: 4,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
      scales: {
        x: CHART_DEFAULTS.scales.x,
        y: { ...CHART_DEFAULTS.scales.y, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => fmtDollar(v) } },
      },
    },
  });
}

/* ── Scenario Comparison Bar Charts ──────────────────── */
function renderScenarioCfChart(canvasId, scenarios) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const names = Object.keys(scenarios);
  const colorMap = { '🚀 Bull Case': CHART_COLORS.green, '📊 Base Case': CHART_COLORS.gold, '🐻 Bear Case': CHART_COLORS.red };

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: names,
      datasets: [{
        label: 'Annual Cash Flow',
        data: names.map(n => scenarios[n].annualCf),
        backgroundColor: names.map(n => colorMap[n] || CHART_COLORS.gold),
        borderRadius: 4,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
      scales: {
        x: CHART_DEFAULTS.scales.x,
        y: { ...CHART_DEFAULTS.scales.y, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => fmtDollar(v) } },
      },
    },
  });
}

function renderScenarioIrrCocChart(canvasId, scenarios) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const names = Object.keys(scenarios);
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: names,
      datasets: [
        { label: 'IRR %', data: names.map(n => scenarios[n].irr * 100), backgroundColor: CHART_COLORS.teal, borderRadius: 4 },
        { label: 'CoC Return %', data: names.map(n => scenarios[n].cashOnCash * 100), backgroundColor: CHART_COLORS.purple, borderRadius: 4 },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        x: CHART_DEFAULTS.scales.x,
        y: { ...CHART_DEFAULTS.scales.y, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => v.toFixed(1) + '%' } },
      },
    },
  });
}

/* ── Portfolio Charts ────────────────────────────────── */
function renderPortfolioCfChart(canvasId, properties) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: properties.map(p => p.name),
      datasets: [{
        label: 'Annual Cash Flow',
        data: properties.map(p => p.annualCf),
        backgroundColor: properties.map(p => p.annualCf >= 0 ? CHART_COLORS.green : CHART_COLORS.red),
        borderRadius: 4,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
      scales: {
        x: CHART_DEFAULTS.scales.x,
        y: { ...CHART_DEFAULTS.scales.y, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => fmtDollar(v) } },
      },
    },
  });
}

function renderPortfolioIrrChart(canvasId, properties) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: properties.map(p => p.name),
      datasets: [{
        label: '10-Year IRR',
        data: properties.map(p => p.irr * 100),
        backgroundColor: CHART_COLORS.teal,
        borderRadius: 4,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } },
      scales: {
        x: CHART_DEFAULTS.scales.x,
        y: { ...CHART_DEFAULTS.scales.y, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => v.toFixed(1) + '%' } },
      },
    },
  });
}
