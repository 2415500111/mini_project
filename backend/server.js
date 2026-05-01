const express = require('express');
const cors = require('cors');
const path = require('path');

const analysisRoutes = require('./routes/analysis');
const scenariosRoutes = require('./routes/scenarios');
const portfolioRoutes = require('./routes/portfolio');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Routes
app.use('/api/analyze', analysisRoutes);
app.use('/api/scenarios', scenariosRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  🏢 Real Estate AI Platform — Backend`);
  console.log(`  ────────────────────────────────────`);
  console.log(`  ✅ Server running on http://localhost:${PORT}`);
  console.log(`  📡 API endpoints ready at /api/*`);
  console.log(`  🌐 Frontend served at http://localhost:${PORT}\n`);
});
