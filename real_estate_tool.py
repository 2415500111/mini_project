import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np
from anthropic import Anthropic

st.set_page_config(
    page_title="PROJECT 25 · Real Estate AI",
    page_icon="🏢",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;600;700&display=swap');

    html, body, [class*="css"] {
        font-family: 'DM Sans', sans-serif;
        background-color: #0a0a0a;
        color: #e5e5e5;
    }
    .main { background-color: #0a0a0a; }
    .stApp { background-color: #0a0a0a; }
    section[data-testid="stSidebar"] { background-color: #111; border-right: 1px solid #1e1e1e; }

    .metric-card {
        background: #111;
        border: 1px solid #2a2a2a;
        border-radius: 12px;
        padding: 18px 20px;
        margin-bottom: 12px;
    }
    .metric-label { color: #888; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }
    .metric-value { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 700; line-height: 1; }
    .metric-sub { color: #555; font-size: 11px; margin-top: 5px; }

    .header-eyebrow { color: #c8a96e; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; }
    .header-title { font-family: 'Playfair Display', serif; font-size: 32px; color: #f5f5f5; margin: 4px 0 0 0; }

    .score-box {
        background: #111;
        border: 1px solid #2a2a2a;
        border-radius: 12px;
        padding: 16px 24px;
        text-align: center;
    }
    .score-label { color: #888; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }
    .score-value { font-family: 'Playfair Display', serif; font-size: 52px; font-weight: 900; line-height: 1; }

    .ai-panel {
        background: #111;
        border: 1px solid #2a2218;
        border-left: 3px solid #c8a96e;
        border-radius: 10px;
        padding: 20px;
        margin-top: 16px;
        line-height: 1.75;
        color: #ccc;
        font-size: 14px;
    }

    .stSlider > div > div > div { background: #c8a96e !important; }
    .stTabs [data-baseweb="tab"] { color: #666; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; }
    .stTabs [aria-selected="true"] { color: #c8a96e !important; border-bottom-color: #c8a96e !important; }
    div[data-testid="stMetricValue"] { font-family: 'Playfair Display', serif; }
    .stDataFrame { background: #111; }
    hr { border-color: #1e1e1e; }
</style>
""", unsafe_allow_html=True)

def fmt_usd(n):
    if n < 0:
        return f"-${abs(n):,.0f}"
    return f"${n:,.0f}"

def fmt_pct(n):
    return f"{n * 100:.1f}%"

def calc_metrics(price, down_pct, rate, years, rent, expenses, appreciation, vacancy_rate):
    down = price * down_pct
    loan = price - down
    monthly_rate = rate / 12
    n = years * 12

    if monthly_rate == 0:
        mortgage = loan / n
    else:
        mortgage = loan * (monthly_rate * (1 + monthly_rate)**n) / ((1 + monthly_rate)**n - 1)

    effective_rent = rent * (1 - vacancy_rate)
    net_monthly = effective_rent - expenses - mortgage
    annual_cf = net_monthly * 12
    cash_on_cash = annual_cf / down if down > 0 else 0
    cap_rate = ((effective_rent - expenses) * 12) / price if price > 0 else 0

    cash_flows = [-down]
    for y in range(1, 11):
        rent_y = effective_rent * (1.02 ** (y - 1))
        exp_y = expenses * (1.03 ** (y - 1))
        cf = (rent_y - exp_y - mortgage) * 12
        if y == 10:
            sale_price = price * ((1 + appreciation) ** 10)
            remaining = loan * ((1 + monthly_rate)**n - (1 + monthly_rate)**(y * 12)) / ((1 + monthly_rate)**n - 1)
            cash_flows.append(cf + sale_price - remaining)
        else:
            cash_flows.append(cf)

    irr = 0.10
    for _ in range(100):
        npv = sum(cf / (1 + irr)**t for t, cf in enumerate(cash_flows))
        dnpv = sum(-t * cf / (1 + irr)**(t + 1) for t, cf in enumerate(cash_flows))
        if abs(dnpv) < 1e-10:
            break
        irr -= npv / dnpv
        if abs(npv) < 0.01:
            break

    projection = []
    for y in range(11):
        prop_val = price * ((1 + appreciation) ** y)
        if y == 0:
            equity = down
        else:
            remaining = loan * ((1 + monthly_rate)**n - (1 + monthly_rate)**(y * 12)) / ((1 + monthly_rate)**n - 1)
            equity = prop_val - remaining
        rent_y = effective_rent * (1.02 ** y)
        exp_y = expenses * (1.03 ** y)
        cf_y = (rent_y - exp_y - mortgage) * 12
        projection.append({
            "Year": f"Y{y}",
            "Property Value": round(prop_val),
            "Equity": round(equity),
            "Annual Cash Flow": round(cf_y),
            "Rental Income": round(rent_y * 12),
        })

    return {
        "mortgage": mortgage,
        "net_monthly": net_monthly,
        "annual_cf": annual_cf,
        "cash_on_cash": cash_on_cash,
        "cap_rate": cap_rate,
        "irr": irr,
        "down": down,
        "loan": loan,
        "projection": projection,
    }

def investment_score(m):
    score = 50 + m["cash_on_cash"] * 400 + m["cap_rate"] * 300 + m["irr"] * 100
    return max(1, min(99, round(score)))

PLOT_LAYOUT = dict(
    paper_bgcolor="#0a0a0a",
    plot_bgcolor="#111",
    font_color="#888",
    margin=dict(l=50, r=20, t=30, b=40),
    xaxis=dict(gridcolor="#1e1e1e", showline=False),
    yaxis=dict(gridcolor="#1e1e1e", showline=False),
    legend=dict(bgcolor="#111", bordercolor="#2a2a2a", borderwidth=1),
)

with st.sidebar:
    st.markdown('<div class="header-eyebrow">PROJECT 25 · AI-POWERED</div>', unsafe_allow_html=True)
    st.markdown('<div class="header-title">Real Estate<br><em>Analysis Platform</em></div>', unsafe_allow_html=True)
    st.markdown("---")

    st.subheader("🏠 Property Parameters")
    price = st.slider("Purchase Price ($)", 100_000, 2_000_000, 450_000, 10_000, format="$%d")
    down_pct = st.slider("Down Payment (%)", 5, 50, 20) / 100
    rate = st.slider("Mortgage Rate (%)", 3.0, 12.0, 7.0, 0.25) / 100
    years = st.select_slider("Loan Term (Years)", [10, 15, 20, 25, 30], 30)

    st.markdown("---")
    st.subheader("💰 Income & Expenses")
    rent = st.slider("Monthly Rent ($)", 500, 10_000, 3_200, 50, format="$%d")
    expenses = st.slider("Monthly Expenses ($)", 100, 3_000, 800, 50, format="$%d")
    vacancy = st.slider("Vacancy Rate (%)", 0, 30, 5) / 100
    appreciation = st.slider("Annual Appreciation (%)", 0.0, 12.0, 4.0, 0.5) / 100

    st.markdown("---")
    api_key = st.text_input("🔑 Anthropic API Key (for AI)", type="password", help="Required for AI analysis features")

m = calc_metrics(price, down_pct, rate, years, rent, expenses, appreciation, vacancy)
score = investment_score(m)
score_color = "#4ade80" if m["cash_on_cash"] > 0.06 else "#c8a96e" if m["cash_on_cash"] > 0 else "#f87171"

col_title, col_score = st.columns([3, 1])
with col_title:
    st.markdown('<div class="header-eyebrow">PROJECT 25 · AI-POWERED PLATFORM</div>', unsafe_allow_html=True)
    st.markdown('<h1 style="font-family:\'Playfair Display\',serif;font-size:30px;color:#f5f5f5;margin:4px 0">Real Estate Investment Analysis Tool</h1>', unsafe_allow_html=True)
with col_score:
    st.markdown(f"""
    <div class="score-box">
        <div class="score-label">Investment Score</div>
        <div class="score-value" style="color:{score_color}">{score}</div>
        <div style="color:#555;font-size:11px">/100</div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("---")

tab1, tab2, tab3, tab4 = st.tabs(["📊 Analysis", "📈 Projections", "⚡ Scenarios", "🏦 Portfolio"])

with tab1:
    c1, c2, c3, c4, c5, c6 = st.columns(6)
    metrics_cfg = [
        (c1, "Monthly Cash Flow", fmt_usd(m["net_monthly"]), "#4ade80" if m["net_monthly"] >= 0 else "#f87171"),
        (c2, "Annual Cash Flow", fmt_usd(m["annual_cf"]), "#c8a96e"),
        (c3, "Cash-on-Cash", fmt_pct(m["cash_on_cash"]), "#818cf8"),
        (c4, "Cap Rate", fmt_pct(m["cap_rate"]), "#34d399"),
        (c5, "10-Yr IRR", fmt_pct(m["irr"]), "#22d3ee"),
        (c6, "Monthly Mortgage", fmt_usd(m["mortgage"]), "#f472b6"),
    ]
    for col, label, value, color in metrics_cfg:
        with col:
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">{label}</div>
                <div class="metric-value" style="color:{color}">{value}</div>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("---")
    col_radar, col_breakdown = st.columns(2)

    with col_radar:
        st.markdown("**Investment Health Radar**")
        categories = ["Cash Flow", "Cap Rate", "IRR", "CoC Return", "Equity Build"]
        proj = m["projection"]
        values = [
            min(100, max(0, 50 + m["annual_cf"] / 500)),
            min(100, m["cap_rate"] * 1000),
            min(100, m["irr"] * 300),
            min(100, m["cash_on_cash"] * 500),
            min(100, (proj[10]["Equity"] / price) * 50),
        ]
        fig_radar = go.Figure(go.Scatterpolar(
            r=values + [values[0]],
            theta=categories + [categories[0]],
            fill="toself",
            fillcolor="rgba(200,169,110,0.15)",
            line=dict(color="#c8a96e", width=2),
            name="Score",
        ))
        fig_radar.update_layout(
            polar=dict(
                bgcolor="#111",
                radialaxis=dict(visible=True, range=[0, 100], color="#333", gridcolor="#2a2a2a"),
                angularaxis=dict(color="#666", gridcolor="#2a2a2a"),
            ),
            **{k: v for k, v in PLOT_LAYOUT.items() if k not in ("xaxis", "yaxis")},
            height=340,
            showlegend=False,
        )
        st.plotly_chart(fig_radar, use_container_width=True)

    with col_breakdown:
        st.markdown("**Monthly Cash Flow Breakdown**")
        eff_rent = rent * (1 - vacancy)
        breakdown_data = {
            "Item": ["Effective Rent", "Operating Expenses", "Mortgage Payment", "Net Cash Flow"],
            "Amount ($)": [round(eff_rent), -round(expenses), -round(m["mortgage"]), round(m["net_monthly"])],
        }
        df_b = pd.DataFrame(breakdown_data)
        colors_b = ["#34d399", "#f87171", "#f472b6", "#4ade80" if m["net_monthly"] >= 0 else "#f87171"]
        fig_break = go.Figure(go.Bar(
            x=df_b["Amount ($)"],
            y=df_b["Item"],
            orientation="h",
            marker_color=colors_b,
            text=[f"${abs(v):,.0f}" for v in df_b["Amount ($)"]],
            textposition="outside",
            textfont_color="#888",
        ))
        fig_break.update_layout(**PLOT_LAYOUT, height=340, xaxis_title="Amount ($)", yaxis_title="")
        st.plotly_chart(fig_break, use_container_width=True)

    st.markdown("---")
    st.markdown("### 🤖 AI Investment Advisor")
    if not api_key:
        st.info("Enter your Anthropic API key in the sidebar to enable AI analysis.")
    else:
        if st.button("Generate AI Investment Analysis", use_container_width=True):
            client = Anthropic(api_key=api_key)
            prompt = f"""You are a senior real estate investment advisor. Analyze this property investment (3-4 paragraphs):
- Purchase Price: {fmt_usd(price)}
- Down Payment: {down_pct*100:.0f}% ({fmt_usd(m['down'])})
- Monthly Rent: {fmt_usd(rent)} | Monthly Expenses: {fmt_usd(expenses)}
- Net Monthly Cash Flow: {fmt_usd(m['net_monthly'])}
- Annual Cash Flow: {fmt_usd(m['annual_cf'])}
- Cash-on-Cash Return: {fmt_pct(m['cash_on_cash'])}
- Cap Rate: {fmt_pct(m['cap_rate'])}
- 10-Year IRR: {fmt_pct(m['irr'])}
- Mortgage Rate: {rate*100:.2f}% | Appreciation: {appreciation*100:.1f}%/yr

Provide: 1) Investment attractiveness 2) Key risks 3) Whether to buy/pass and why. Be direct and specific."""

            with st.spinner("Analyzing investment..."):
                response = client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=1000,
                    messages=[{"role": "user", "content": prompt}]
                )
                insight = response.content[0].text
            st.markdown(f'<div class="ai-panel">{insight}</div>', unsafe_allow_html=True)

with tab2:
    proj = m["projection"]
    df_proj = pd.DataFrame(proj)

    fig_val = go.Figure()
    fig_val.add_trace(go.Scatter(
        x=df_proj["Year"], y=df_proj["Property Value"],
        fill="tozeroy", fillcolor="rgba(200,169,110,0.12)",
        line=dict(color="#c8a96e", width=2.5),
        name="Property Value",
    ))
    fig_val.add_trace(go.Scatter(
        x=df_proj["Year"], y=df_proj["Equity"],
        fill="tozeroy", fillcolor="rgba(129,140,248,0.12)",
        line=dict(color="#818cf8", width=2.5),
        name="Equity",
    ))
    fig_val.update_layout(**PLOT_LAYOUT, title="Property Value & Equity Growth (10 Years)", height=320, yaxis_tickprefix="$", yaxis_tickformat=",")
    st.plotly_chart(fig_val, use_container_width=True)

    col_cf, col_rent = st.columns(2)
    with col_cf:
        fig_cf = go.Figure(go.Bar(
            x=df_proj["Year"][1:], y=df_proj["Annual Cash Flow"][1:],
            marker_color=["#4ade80" if v >= 0 else "#f87171" for v in df_proj["Annual Cash Flow"][1:]],
            marker_line_width=0,
        ))
        fig_cf.update_layout(**PLOT_LAYOUT, title="Annual Cash Flow Projection", height=280, yaxis_tickprefix="$", yaxis_tickformat=",")
        st.plotly_chart(fig_cf, use_container_width=True)

    with col_rent:
        fig_rent = go.Figure(go.Bar(
            x=df_proj["Year"][1:], y=df_proj["Rental Income"][1:],
            marker_color="#34d399",
            marker_line_width=0,
        ))
        fig_rent.update_layout(**PLOT_LAYOUT, title="Annual Rental Income Growth", height=280, yaxis_tickprefix="$", yaxis_tickformat=",")
        st.plotly_chart(fig_rent, use_container_width=True)

    st.markdown("**Year-by-Year Breakdown**")
    df_display = df_proj.copy()
    for col in ["Property Value", "Equity", "Annual Cash Flow", "Rental Income"]:
        df_display[col] = df_display[col].apply(lambda v: f"${v:,.0f}")
    st.dataframe(df_display, use_container_width=True, hide_index=True)

with tab3:
    SCENARIOS = {
        "🚀 Bull Case": {"appreciation": 0.07, "vacancy_rate": 0.02, "rate": 0.065},
        "📊 Base Case": {"appreciation": appreciation, "vacancy_rate": vacancy, "rate": rate},
        "🐻 Bear Case": {"appreciation": 0.01, "vacancy_rate": 0.12, "rate": 0.085},
    }
    SCENARIO_COLORS = {"🚀 Bull Case": "#4ade80", "📊 Base Case": "#c8a96e", "🐻 Bear Case": "#f87171"}

    scenario_results = {}
    for name, ov in SCENARIOS.items():
        sm = calc_metrics(price, down_pct, ov["rate"], years, rent, expenses, ov["appreciation"], ov["vacancy_rate"])
        scenario_results[name] = sm

    cols = st.columns(3)
    for (name, sm), col in zip(scenario_results.items(), cols):
        color = SCENARIO_COLORS[name]
        with col:
            st.markdown(f'<div style="color:{color};font-size:18px;font-weight:700;margin-bottom:8px">{name}</div>', unsafe_allow_html=True)
            data = {
                "Metric": ["Annual Cash Flow", "Cap Rate", "Cash-on-Cash", "10-Yr IRR", "Monthly P&L"],
                "Value": [fmt_usd(sm["annual_cf"]), fmt_pct(sm["cap_rate"]), fmt_pct(sm["cash_on_cash"]), fmt_pct(sm["irr"]), fmt_usd(sm["net_monthly"])],
            }
            st.dataframe(pd.DataFrame(data), use_container_width=True, hide_index=True)

    st.markdown("---")

    names = list(scenario_results.keys())
    annual_cfs = [scenario_results[n]["annual_cf"] for n in names]
    irrs = [scenario_results[n]["irr"] * 100 for n in names]
    cocs = [scenario_results[n]["cash_on_cash"] * 100 for n in names]
    colors = [SCENARIO_COLORS[n] for n in names]

    col_cmp1, col_cmp2 = st.columns(2)
    with col_cmp1:
        fig_s1 = go.Figure(go.Bar(
            x=names, y=annual_cfs,
            marker_color=colors, marker_line_width=0,
            text=[fmt_usd(v) for v in annual_cfs], textposition="outside",
            textfont_color="#888",
        ))
        fig_s1.update_layout(**PLOT_LAYOUT, title="Annual Cash Flow by Scenario", yaxis_tickprefix="$", yaxis_tickformat=",", height=320)
        st.plotly_chart(fig_s1, use_container_width=True)

    with col_cmp2:
        fig_s2 = go.Figure()
        fig_s2.add_trace(go.Bar(x=names, y=irrs, name="IRR %", marker_color="#22d3ee"))
        fig_s2.add_trace(go.Bar(x=names, y=cocs, name="CoC Return %", marker_color="#818cf8"))
        fig_s2.update_layout(**PLOT_LAYOUT, title="IRR vs Cash-on-Cash by Scenario", barmode="group", yaxis_ticksuffix="%", height=320)
        st.plotly_chart(fig_s2, use_container_width=True)

with tab4:
    PORTFOLIO = [
        {"name": "Downtown Condo",   "price": 420000, "rent": 2800, "expenses": 650,  "down_pct": 0.20, "rate": 0.070, "appreciation": 0.045, "vacancy": 0.04, "years": 30},
        {"name": "Suburban House",   "price": 380000, "rent": 2400, "expenses": 550,  "down_pct": 0.25, "rate": 0.068, "appreciation": 0.035, "vacancy": 0.06, "years": 30},
        {"name": "Multi-Family Unit","price": 780000, "rent": 5200, "expenses": 1200, "down_pct": 0.30, "rate": 0.075, "appreciation": 0.050, "vacancy": 0.08, "years": 30},
    ]

    portfolio_rows = []
    for p in PORTFOLIO:
        pm = calc_metrics(p["price"], p["down_pct"], p["rate"], p["years"], p["rent"], p["expenses"], p["appreciation"], p["vacancy"])
        portfolio_rows.append({
            "Property": p["name"],
            "Price": fmt_usd(p["price"]),
            "Equity Down": fmt_usd(pm["down"]),
            "Monthly CF": fmt_usd(pm["net_monthly"]),
            "Cap Rate": fmt_pct(pm["cap_rate"]),
            "CoC Return": fmt_pct(pm["cash_on_cash"]),
            "IRR": fmt_pct(pm["irr"]),
            "_annual_cf": pm["annual_cf"],
            "_down": pm["down"],
            "_irr": pm["irr"],
        })

    total_down = sum(r["_down"] for r in portfolio_rows)
    total_cf = sum(r["_annual_cf"] for r in portfolio_rows)
    avg_irr = sum(r["_irr"] for r in portfolio_rows) / len(portfolio_rows)

    c1, c2, c3 = st.columns(3)
    with c1:
        st.markdown(f"""<div class="metric-card">
            <div class="metric-label">Total Capital Deployed</div>
            <div class="metric-value" style="color:#c8a96e">{fmt_usd(total_down)}</div>
            <div class="metric-sub">{len(PORTFOLIO)} properties</div>
        </div>""", unsafe_allow_html=True)
    with c2:
        cf_color = "#4ade80" if total_cf >= 0 else "#f87171"
        st.markdown(f"""<div class="metric-card">
            <div class="metric-label">Total Annual Cash Flow</div>
            <div class="metric-value" style="color:{cf_color}">{fmt_usd(total_cf)}</div>
            <div class="metric-sub">Across all properties</div>
        </div>""", unsafe_allow_html=True)
    with c3:
        st.markdown(f"""<div class="metric-card">
            <div class="metric-label">Portfolio Avg IRR</div>
            <div class="metric-value" style="color:#22d3ee">{fmt_pct(avg_irr)}</div>
            <div class="metric-sub">10-year horizon</div>
        </div>""", unsafe_allow_html=True)

    st.markdown("**Portfolio Holdings**")
    df_port = pd.DataFrame([{k: v for k, v in r.items() if not k.startswith("_")} for r in portfolio_rows])
    st.dataframe(df_port, use_container_width=True, hide_index=True)

    names_p = [r["Property"] for r in portfolio_rows]
    cfs_p = [r["_annual_cf"] for r in portfolio_rows]
    irrs_p = [r["_irr"] * 100 for r in portfolio_rows]

    col_p1, col_p2 = st.columns(2)
    with col_p1:
        fig_p1 = go.Figure(go.Bar(
            x=names_p, y=cfs_p,
            marker_color=["#4ade80" if v >= 0 else "#f87171" for v in cfs_p],
            marker_line_width=0,
        ))
        fig_p1.update_layout(**PLOT_LAYOUT, title="Annual Cash Flow by Property", yaxis_tickprefix="$", yaxis_tickformat=",", height=300)
        st.plotly_chart(fig_p1, use_container_width=True)

    with col_p2:
        fig_p2 = go.Figure(go.Bar(
            x=names_p, y=irrs_p,
            marker_color="#22d3ee",
            marker_line_width=0,
            text=[f"{v:.1f}%" for v in irrs_p],
            textposition="outside", textfont_color="#888",
        ))
        fig_p2.update_layout(**PLOT_LAYOUT, title="10-Year IRR by Property", yaxis_ticksuffix="%", height=300)
        st.plotly_chart(fig_p2, use_container_width=True)

    st.markdown("---")
    st.markdown("### 🤖 AI Portfolio Strategy Review")
    if not api_key:
        st.info("Enter your Anthropic API key in the sidebar to enable AI portfolio analysis.")
    else:
        if st.button("Generate Portfolio Strategy Analysis", use_container_width=True):
            client = Anthropic(api_key=api_key)
            summary_lines = "\n".join([
                f"{p['name']}: Price {fmt_usd(p['price'])}, CoC {fmt_pct(r['_annual_cf'] / r['_down'])}, IRR {fmt_pct(r['_irr'])}, Annual CF {fmt_usd(r['_annual_cf'])}"
                for p, r in zip(PORTFOLIO, portfolio_rows)
            ])
            prompt = f"""Analyze this real estate portfolio and give strategic recommendations (3 paragraphs):

{summary_lines}

Total Capital Deployed: {fmt_usd(total_down)}
Total Annual Cash Flow: {fmt_usd(total_cf)}
Portfolio Avg IRR: {fmt_pct(avg_irr)}

Which properties to hold, sell, or expand? What's the portfolio's overall health and recommended next steps?"""

            with st.spinner("Analyzing portfolio..."):
                response = client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=1000,
                    messages=[{"role": "user", "content": prompt}]
                )
                portfolio_insight = response.content[0].text
            st.markdown(f'<div class="ai-panel">{portfolio_insight}</div>', unsafe_allow_html=True)

st.markdown("---")
st.markdown(
    '<div style="color:#333;font-size:11px;text-align:center;letter-spacing:0.08em">'
    'PROJECT 25 · REAL ESTATE INVESTMENT ANALYSIS PLATFORM · POWERED BY STREAMLIT + ANTHROPIC</div>',
    unsafe_allow_html=True
)