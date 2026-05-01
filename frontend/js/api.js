/**
 * API Client — Fetch wrapper for backend communication
 */
const API_BASE = window.location.origin;

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  const response = await fetch(url, config);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchAnalysis(params) {
  return apiFetch('/api/analyze', { method: 'POST', body: params });
}

async function fetchScenarios(params) {
  return apiFetch('/api/scenarios', { method: 'POST', body: params });
}

async function fetchPortfolio() {
  return apiFetch('/api/portfolio', { method: 'GET' });
}

async function fetchAIAnalysis(metricsForPrompt, apiKey) {
  return apiFetch('/api/ai/analyze', { method: 'POST', body: { apiKey, metrics: metricsForPrompt } });
}

async function fetchAIPortfolio(portfolioSummary, apiKey) {
  return apiFetch('/api/ai/portfolio', { method: 'POST', body: { apiKey, portfolioSummary } });
}
