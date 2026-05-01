/**
 * Main App Controller — Real Estate AI Platform
 * Handles tab navigation, slider bindings, data fetching, and UI rendering
 */

// ── Formatting helpers ──────────────────────────────────
function fmtUsd(n) {
  if (n < 0) return `-$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
function fmtPct(n) { return `${(n * 100).toFixed(1)}%`; }

// ── State ───────────────────────────────────────────────
let currentData = null;
let scenarioData = null;
let portfolioData = null;
let debounceTimer = null;

// ── Read slider values ──────────────────────────────────
function getParams() {
  return {
    price: parseInt(document.getElementById('slider-price').value),
    downPct: parseInt(document.getElementById('slider-down').value) / 100,
    rate: parseFloat(document.getElementById('slider-rate').value) / 100,
    years: parseInt(document.getElementById('select-term').value),
    rent: parseInt(document.getElementById('slider-rent').value),
    expenses: parseInt(document.getElementById('slider-expenses').value),
    vacancyRate: parseInt(document.getElementById('slider-vacancy').value) / 100,
    appreciation: parseFloat(document.getElementById('slider-appreciation').value) / 100,
  };
}

// ── Update slider display values ────────────────────────
function bindSliderDisplays() {
  const sliders = [
    { id: 'slider-price', display: 'val-price', fmt: v => `$${parseInt(v).toLocaleString()}` },
    { id: 'slider-down', display: 'val-down', fmt: v => `${v}%` },
    { id: 'slider-rate', display: 'val-rate', fmt: v => `${v}%` },
    { id: 'slider-rent', display: 'val-rent', fmt: v => `$${parseInt(v).toLocaleString()}` },
    { id: 'slider-expenses', display: 'val-expenses', fmt: v => `$${parseInt(v).toLocaleString()}` },
    { id: 'slider-vacancy', display: 'val-vacancy', fmt: v => `${v}%` },
    { id: 'slider-appreciation', display: 'val-appreciation', fmt: v => `${v}%` },
  ];

  sliders.forEach(({ id, display, fmt }) => {
    const el = document.getElementById(id);
    const dispEl = document.getElementById(display);
    if (!el || !dispEl) return;
    dispEl.textContent = fmt(el.value);
    el.addEventListener('input', () => {
      dispEl.textContent = fmt(el.value);
      debouncedUpdate();
    });
  });

  const termSelect = document.getElementById('select-term');
  if (termSelect) {
    termSelect.addEventListener('change', () => debouncedUpdate());
  }
}

function debouncedUpdate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => updateAnalysis(), 300);
}

// ── Tab Navigation ──────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = document.getElementById(btn.dataset.tab);
      if (panel) panel.classList.add('active');

      // Load data for specific tabs on first click
      if (btn.dataset.tab === 'tab-scenarios' && !scenarioData) loadScenarios();
      if (btn.dataset.tab === 'tab-portfolio' && !portfolioData) loadPortfolio();
    });
  });
}

// ── Main Analysis Update ────────────────────────────────
async function updateAnalysis() {
  try {
    const params = getParams();
    const result = await fetchAnalysis(params);
    if (!result.success) return;

    currentData = result;
    renderMetrics(result.metrics, result.score);
    renderAnalysisCharts(result.metrics, result.projection, params);
    renderProjectionTab(result.projection);
    // Reset scenario data to refresh with new params
    scenarioData = null;
    // Check if scenarios tab is active
    const scenTab = document.querySelector('[data-tab="tab-scenarios"]');
    if (scenTab && scenTab.classList.contains('active')) loadScenarios();
  } catch (err) {
    console.error('Update analysis failed:', err);
  }
}

// ── Render Metrics Cards ────────────────────────────────
function renderMetrics(m, score) {
  const scoreEl = document.getElementById('score-value');
  const scoreColor = m.cashOnCash > 0.06 ? 'var(--green)' : m.cashOnCash > 0 ? 'var(--gold)' : 'var(--red)';
  if (scoreEl) {
    scoreEl.textContent = score;
    scoreEl.style.color = scoreColor;
  }

  const cards = [
    { id: 'mc-cashflow', value: fmtUsd(m.netMonthly), color: m.netMonthly >= 0 ? 'var(--green)' : 'var(--red)' },
    { id: 'mc-annual', value: fmtUsd(m.annualCf), color: 'var(--gold)' },
    { id: 'mc-coc', value: fmtPct(m.cashOnCash), color: 'var(--purple)' },
    { id: 'mc-cap', value: fmtPct(m.capRate), color: 'var(--emerald)' },
    { id: 'mc-irr', value: fmtPct(m.irr), color: 'var(--teal)' },
    { id: 'mc-mortgage', value: fmtUsd(m.mortgage), color: 'var(--pink)' },
  ];

  cards.forEach(({ id, value, color }) => {
    const el = document.querySelector(`#${id} .metric-value`);
    if (el) { el.textContent = value; el.style.color = color; }
  });
}

// ── Render Analysis Tab Charts ──────────────────────────
function renderAnalysisCharts(m, projection, params) {
  const effectiveRent = params.rent * (1 - params.vacancyRate);
  renderRadarChart('chart-radar', m, projection);
  renderBreakdownChart('chart-breakdown', effectiveRent, params.expenses, m.mortgage, m.netMonthly);
}

// ── Render Projections Tab ──────────────────────────────
function renderProjectionTab(projection) {
  renderValueEquityChart('chart-value-equity', projection);
  renderAnnualCfChart('chart-annual-cf', projection);
  renderRentalIncomeChart('chart-rental-income', projection);

  // Build data table
  const tbody = document.getElementById('projection-tbody');
  if (!tbody) return;
  tbody.innerHTML = projection.map(p => `
    <tr>
      <td>${p.year}</td>
      <td>${fmtUsd(p.propertyValue)}</td>
      <td>${fmtUsd(p.equity)}</td>
      <td style="color:${p.annualCashFlow >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtUsd(p.annualCashFlow)}</td>
      <td>${fmtUsd(p.rentalIncome)}</td>
    </tr>
  `).join('');
}

// ── Load Scenarios ──────────────────────────────────────
async function loadScenarios() {
  try {
    const params = getParams();
    const result = await fetchScenarios(params);
    if (!result.success) return;
    scenarioData = result.scenarios;
    renderScenarios(scenarioData);
  } catch (err) {
    console.error('Scenarios failed:', err);
  }
}

function renderScenarios(scenarios) {
  const colorMap = { '🚀 Bull Case': 'var(--green)', '📊 Base Case': 'var(--gold)', '🐻 Bear Case': 'var(--red)' };
  const container = document.getElementById('scenarios-cards');
  if (!container) return;

  container.innerHTML = Object.entries(scenarios).map(([name, s]) => `
    <div class="scenario-card">
      <div class="scenario-name" style="color:${colorMap[name] || 'var(--gold)'}">${name}</div>
      <div class="scenario-metrics">
        <div class="scenario-row"><span class="label">Annual Cash Flow</span><span class="value">${fmtUsd(s.annualCf)}</span></div>
        <div class="scenario-row"><span class="label">Cap Rate</span><span class="value">${fmtPct(s.capRate)}</span></div>
        <div class="scenario-row"><span class="label">Cash-on-Cash</span><span class="value">${fmtPct(s.cashOnCash)}</span></div>
        <div class="scenario-row"><span class="label">10-Yr IRR</span><span class="value">${fmtPct(s.irr)}</span></div>
        <div class="scenario-row"><span class="label">Monthly P&L</span><span class="value">${fmtUsd(s.netMonthly)}</span></div>
      </div>
    </div>
  `).join('');

  renderScenarioCfChart('chart-scenario-cf', scenarios);
  renderScenarioIrrCocChart('chart-scenario-irr', scenarios);
}

// ── Load Portfolio ──────────────────────────────────────
async function loadPortfolio() {
  try {
    const result = await fetchPortfolio();
    if (!result.success) return;
    portfolioData = result;
    renderPortfolio(result);
  } catch (err) {
    console.error('Portfolio failed:', err);
  }
}

function renderPortfolio(data) {
  // Summary cards
  const summaryEl = document.getElementById('portfolio-summary');
  if (summaryEl) {
    const s = data.summary;
    const cfColor = s.totalCf >= 0 ? 'var(--green)' : 'var(--red)';
    summaryEl.innerHTML = `
      <div class="metric-card"><div class="metric-label">Total Capital Deployed</div><div class="metric-value" style="color:var(--gold)">${s.totalDownFormatted}</div><div style="color:var(--text-dim);font-size:11px;margin-top:5px">${s.count} properties</div></div>
      <div class="metric-card"><div class="metric-label">Total Annual Cash Flow</div><div class="metric-value" style="color:${cfColor}">${s.totalCfFormatted}</div><div style="color:var(--text-dim);font-size:11px;margin-top:5px">Across all properties</div></div>
      <div class="metric-card"><div class="metric-label">Portfolio Avg IRR</div><div class="metric-value" style="color:var(--teal)">${s.avgIrrFormatted}</div><div style="color:var(--text-dim);font-size:11px;margin-top:5px">10-year horizon</div></div>
    `;
  }

  // Table
  const tbody = document.getElementById('portfolio-tbody');
  if (tbody) {
    tbody.innerHTML = data.properties.map(p => `
      <tr>
        <td>${p.name}</td>
        <td>${p.priceFormatted}</td>
        <td>${p.downFormatted}</td>
        <td style="color:${p.netMonthly >= 0 ? 'var(--green)' : 'var(--red)'}">${p.netMonthlyFormatted}</td>
        <td>${p.capRateFormatted}</td>
        <td>${p.cashOnCashFormatted}</td>
        <td>${p.irrFormatted}</td>
      </tr>
    `).join('');
  }

  renderPortfolioCfChart('chart-portfolio-cf', data.properties);
  renderPortfolioIrrChart('chart-portfolio-irr', data.properties);
}

// ── AI Analysis ─────────────────────────────────────────
async function triggerAIAnalysis() {
  const apiKey = document.getElementById('api-key-input').value.trim();
  if (!apiKey) { alert('Please enter your Anthropic API key in the sidebar.'); return; }
  if (!currentData) return;

  const btn = document.getElementById('btn-ai-analyze');
  const panel = document.getElementById('ai-analysis-result');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Analyzing investment...';

  try {
    const params = getParams();
    const metricsForPrompt = {
      price: fmtUsd(params.price), downPct: `${params.downPct * 100}%`, down: fmtUsd(currentData.metrics.down),
      rent: fmtUsd(params.rent), expenses: fmtUsd(params.expenses),
      netMonthly: fmtUsd(currentData.metrics.netMonthly), annualCf: fmtUsd(currentData.metrics.annualCf),
      cashOnCash: fmtPct(currentData.metrics.cashOnCash), capRate: fmtPct(currentData.metrics.capRate),
      irr: fmtPct(currentData.metrics.irr), rate: `${(params.rate * 100).toFixed(2)}%`,
      appreciation: `${(params.appreciation * 100).toFixed(1)}%/yr`,
    };
    const result = await fetchAIAnalysis(metricsForPrompt, apiKey);
    panel.innerHTML = `<div class="ai-panel">${result.insight.replace(/\n/g, '<br>')}</div>`;
  } catch (err) {
    panel.innerHTML = `<div class="ai-panel" style="border-left-color:var(--red)">Error: ${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate AI Investment Analysis';
  }
}

async function triggerAIPortfolio() {
  const apiKey = document.getElementById('api-key-input').value.trim();
  if (!apiKey) { alert('Please enter your Anthropic API key in the sidebar.'); return; }
  if (!portfolioData) return;

  const btn = document.getElementById('btn-ai-portfolio');
  const panel = document.getElementById('ai-portfolio-result');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Analyzing portfolio...';

  try {
    const lines = portfolioData.properties.map(p =>
      `${p.name}: Price ${p.priceFormatted}, CoC ${p.cashOnCashFormatted}, IRR ${p.irrFormatted}, Annual CF ${p.annualCfFormatted}`
    ).join('\n');
    const s = portfolioData.summary;
    const summary = `${lines}\n\nTotal Capital Deployed: ${s.totalDownFormatted}\nTotal Annual Cash Flow: ${s.totalCfFormatted}\nPortfolio Avg IRR: ${s.avgIrrFormatted}`;
    const result = await fetchAIPortfolio(summary, apiKey);
    panel.innerHTML = `<div class="ai-panel">${result.insight.replace(/\n/g, '<br>')}</div>`;
  } catch (err) {
    panel.innerHTML = `<div class="ai-panel" style="border-left-color:var(--red)">Error: ${err.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate Portfolio Strategy Analysis';
  }
}

// ── Initialize ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  bindSliderDisplays();
  initTabs();
  updateAnalysis();
});
