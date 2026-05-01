# 🏢 Real Estate AI Investment Analysis Platform

## 🚀 Overview

An **AI-powered real estate investment analysis tool** built with a **Node.js (Express)** backend and a modern **HTML/CSS/JavaScript** frontend. It helps users make data-driven decisions when buying or investing in properties through predictive analytics, scenario modeling, and AI-powered insights.

---

## 🎯 Key Features

- 📊 **Investment Analysis** — Real-time financial metrics (Cash Flow, Cap Rate, IRR, Cash-on-Cash Return)
- 📈 **10-Year Projections** — Property value, equity growth, and rental income forecasts
- ⚡ **Scenario Modeling** — Bull, Base, and Bear case comparisons
- 🏦 **Portfolio Management** — Multi-property analysis with aggregate metrics
- 🤖 **AI-Powered Insights** — Claude AI integration for investment advice and strategy reviews
- 🎨 **Premium Dark UI** — Glassmorphism design with interactive charts and micro-animations

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express.js |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Charts** | Chart.js |
| **AI Integration** | Anthropic Claude API |
| **Typography** | Google Fonts (Playfair Display, DM Sans) |

---

## 📂 Project Structure

```
mini_project/
├── backend/
│   ├── package.json            # Node.js dependencies
│   ├── server.js               # Express server entry point
│   ├── routes/
│   │   ├── analysis.js         # POST /api/analyze
│   │   ├── scenarios.js        # POST /api/scenarios
│   │   ├── portfolio.js        # GET  /api/portfolio
│   │   └── ai.js               # POST /api/ai/analyze, /api/ai/portfolio
│   └── utils/
│       └── calculations.js     # Financial calculation engine
│
├── frontend/
│   ├── index.html              # Main SPA page
│   ├── css/
│   │   └── styles.css          # Design system (dark theme)
│   └── js/
│       ├── app.js              # Main app controller
│       ├── api.js              # Backend API client
│       └── charts.js           # Chart.js rendering
│
├── .gitignore
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)

### Steps

```bash
# Clone the repository
git clone https://github.com/2415500111/mini_project.git

# Navigate to project folder
cd mini_project

# Install backend dependencies
cd backend
npm install

# Start the server
npm start
```

The application will be available at **http://localhost:3000**

### Development Mode (with auto-reload)
```bash
cd backend
npm run dev
```

---

## 📊 How It Works

1. **User adjusts property parameters** via sidebar sliders (price, down payment, rate, etc.)
2. **Frontend sends parameters** to the Express backend API
3. **Backend computes metrics** — mortgage, cash flow, IRR, cap rate, 10-year projections
4. **Frontend renders results** with interactive Chart.js visualizations
5. **AI Analysis** (optional) — sends metrics to Claude API for professional investment advice

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Compute full investment metrics |
| `POST` | `/api/scenarios` | Bull/Base/Bear scenario analysis |
| `GET` | `/api/portfolio` | Portfolio data with computed metrics |
| `POST` | `/api/ai/analyze` | AI investment analysis (requires API key) |
| `POST` | `/api/ai/portfolio` | AI portfolio strategy review |
| `GET` | `/api/health` | Server health check |

---

## 📌 Future Enhancements

- Integration with live real estate APIs
- User authentication system
- Database persistence for saved analyses
- Mobile responsive PWA version
- Advanced ML-based price prediction

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork this repository and submit a pull request.

---

## 📜 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Ashutosh Sharma**
B.Tech CSE (AI & ML)
GLA University
