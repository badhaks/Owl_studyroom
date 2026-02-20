import { useState, useEffect, useCallback } from "react";

// ── 권한 ──────────────────────────────────────────────────────
const ADMIN_KEYS = ["haks-admin", "haks-owner"];
const ADMIN_PW = "haks2026";

const detectAdmin = () => {
  try {
    const urlKey = new URLSearchParams(window.location.search).get("key");
    if (urlKey && ADMIN_KEYS.includes(urlKey)) {
      localStorage.setItem("aos_key", urlKey);
      sessionStorage.setItem("aos_key", urlKey);
      window.history.replaceState({}, "", window.location.pathname);
      return true;
    }
    const ss = sessionStorage.getItem("aos_key");
    if (ss && ADMIN_KEYS.includes(ss)) return true;
    const ls = localStorage.getItem("aos_key");
    if (ls && ADMIN_KEYS.includes(ls)) { sessionStorage.setItem("aos_key", ls); return true; }
  } catch {}
  return false;
};

// ── 유틸 ──────────────────────────────────────────────────────
const fmtPrice = (v, cur = "USD") => {
  if (!v) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  if (cur === "KRW") return n.toLocaleString("ko-KR") + "원";
  if (cur === "JPY") return "¥" + n.toLocaleString();
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmtPct = (v, plus = true) => {
  if (v === null || v === undefined) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return (plus && n > 0 ? "+" : "") + n.toFixed(1) + "%";
};
const verdictMeta = {
  "STRONG BUY": { color: "#00d27a", bg: "#00d27a18", label: "STRONG BUY" },
  "BUY":        { color: "#3dd68c", bg: "#3dd68c18", label: "BUY" },
  "HOLD":       { color: "#f5a623", bg: "#f5a62318", label: "HOLD" },
  "REDUCE":     { color: "#ff6b6b", bg: "#ff6b6b18", label: "REDUCE" },
  "AVOID":      { color: "#e74c3c", bg: "#e74c3c18", label: "AVOID" },
};
const macroColor = { "긍정": "#00d27a", "중립": "#f5a623", "부정": "#e74c3c" };
const moatColor  = { "넓음": "#00d27a", "보통": "#3498db", "좁음": "#f5a623", "없음": "#e74c3c" };
const stars = (n) => "★".repeat(Math.round(n / 20)) + "☆".repeat(5 - Math.round(n / 20));

// ── 메인 앱 ──────────────────────────────────────────────────
export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => detectAdmin());
  const [stocks, setStocks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("dashboard"); // dashboard | analyze | detail | settings
  const [anthropicKey, setAnthropicKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [filterVerdict, setFilterVerdict] = useState("ALL");
  const [mobileTab, setMobileTab] = useState("dashboard");

  // 로컬스토리지 로드
  useEffect(() => {
    try {
      const s = localStorage.getItem("aos_stocks_v2");
      if (s) setStocks(JSON.parse(s));
      const k = localStorage.getItem("aos_anthropic_key");
      if (k) { setAnthropicKey(k); setKeyInput(k); }
    } catch {}
  }, []);

  const save = (data) => {
    setStocks(data);
    try { localStorage.setItem("aos_stocks_v2", JSON.stringify(data)); } catch {}
  };

  const handleAdminLogin = () => {
    if (pwInput === ADMIN_PW) {
      localStorage.setItem("aos_key", "haks-admin");
      sessionStorage.setItem("aos_key", "haks-admin");
      setIsAdmin(true); setShowPwModal(false); setPwInput(""); setPwError(false);
    } else { setPwError(true); setTimeout(() => setPwError(false), 1500); }
  };

  const saveKey = () => {
    setAnthropicKey(keyInput);
    try { localStorage.setItem("aos_anthropic_key", keyInput); } catch {}
  };

  // 필터/정렬
  const filtered = stocks
    .filter(s => filterVerdict === "ALL" || s.ib?.verdict === filterVerdict)
    .filter(s => !searchQ || s.name?.toLowerCase().includes(searchQ.toLowerCase()) || s.ticker?.toLowerCase().includes(searchQ.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "date") return new Date(b.analyzedAt || 0) - new Date(a.analyzedAt || 0);
      if (sortBy === "upside") return (parseFloat(b.ib?.upsideDownside) || 0) - (parseFloat(a.ib?.upsideDownside) || 0);
      if (sortBy === "quality") return (b.quant?.verdict?.qualityScore || 0) - (a.quant?.verdict?.qualityScore || 0);
      if (sortBy === "mos") return (b.quant?.valuation?.marginOfSafety || 0) - (a.quant?.valuation?.marginOfSafety || 0);
      return 0;
    });

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,400&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #080b11;
      --surface: #0d1117;
      --card: #111827;
      --border: #1e2a3a;
      --border2: #253040;
      --text: #e2e8f0;
      --muted: #64748b;
      --muted2: #94a3b8;
      --accent: #f59e0b;
      --accent2: #fbbf24;
      --green: #10b981;
      --red: #ef4444;
      --blue: #3b82f6;
      --purple: #8b5cf6;
      --font: 'Space Grotesk', sans-serif;
      --mono: 'JetBrains Mono', monospace;
      --serif: 'Fraunces', serif;
    }
    body { background: var(--bg); color: var(--text); font-family: var(--font); min-height: 100vh; }
    input, button, select, textarea { font-family: var(--font); }
    button { cursor: pointer; }
    a { color: inherit; text-decoration: none; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

    /* Layout */
    .layout { display: flex; min-height: 100vh; }
    .sidebar { width: 220px; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; z-index: 100; }
    .main { margin-left: 220px; flex: 1; padding: 28px 32px; min-height: 100vh; }

    /* Sidebar */
    .logo { padding: 24px 20px 20px; border-bottom: 1px solid var(--border); }
    .logo-text { font-family: var(--serif); font-size: 22px; font-weight: 600; color: var(--accent); letter-spacing: -0.5px; }
    .logo-sub { font-size: 9px; color: var(--muted); letter-spacing: 3px; margin-top: 2px; font-family: var(--mono); }
    .nav { padding: 16px 12px; flex: 1; }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 6px; font-size: 13px; color: var(--muted2); cursor: pointer; transition: all 0.15s; margin-bottom: 2px; }
    .nav-item:hover { background: var(--card); color: var(--text); }
    .nav-item.active { background: var(--accent)18; color: var(--accent); font-weight: 500; }
    .nav-icon { font-size: 15px; width: 18px; text-align: center; }
    .nav-badge { margin-left: auto; background: var(--accent); color: #000; font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 3px; font-family: var(--mono); }
    .sidebar-footer { padding: 16px; border-top: 1px solid var(--border); }
    .admin-badge { font-size: 10px; font-family: var(--mono); padding: 4px 8px; border-radius: 4px; text-align: center; }

    /* Cards */
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; }
    .card:hover { border-color: var(--border2); }

    /* Stock cards */
    .stock-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .stock-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
    .stock-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--verdict-color, var(--border)); transition: all 0.2s; }
    .stock-card:hover { border-color: var(--border2); transform: translateY(-1px); box-shadow: 0 8px 24px #00000040; }
    .stock-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
    .stock-ticker { font-family: var(--mono); font-size: 16px; font-weight: 700; color: var(--text); }
    .stock-name { font-size: 11px; color: var(--muted); margin-top: 2px; }
    .verdict-tag { font-family: var(--mono); font-size: 9px; font-weight: 700; padding: 4px 8px; border-radius: 4px; letter-spacing: 1px; }
    .stock-metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 14px; }
    .metric { }
    .metric-label { font-size: 9px; color: var(--muted); letter-spacing: 1.5px; margin-bottom: 3px; font-family: var(--mono); }
    .metric-value { font-size: 15px; font-weight: 600; font-family: var(--mono); }
    .stock-scores { display: flex; gap: 8px; flex-wrap: wrap; }
    .score-pill { font-size: 10px; padding: 3px 8px; border-radius: 3px; border: 1px solid var(--border); color: var(--muted2); font-family: var(--mono); display: flex; align-items: center; gap: 4px; }
    .score-dot { width: 6px; height: 6px; border-radius: 50%; }
    .deal-badge { font-size: 9px; font-family: var(--mono); padding: 2px 6px; border-radius: 3px; background: #ef444418; color: #ef4444; border: 1px solid #ef444430; }

    /* Buttons */
    .btn { padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; border: none; transition: all 0.15s; letter-spacing: 0.5px; }
    .btn-primary { background: var(--accent); color: #000; }
    .btn-primary:hover { background: var(--accent2); }
    .btn-ghost { background: transparent; color: var(--muted2); border: 1px solid var(--border); }
    .btn-ghost:hover { border-color: var(--border2); color: var(--text); }
    .btn-danger { background: transparent; color: var(--red); border: 1px solid #ef444430; }
    .btn-danger:hover { background: #ef444418; }
    .btn-sm { padding: 5px 10px; font-size: 11px; }

    /* Input */
    .inp { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 10px 14px; border-radius: 6px; font-size: 13px; width: 100%; outline: none; transition: border 0.15s; }
    .inp:focus { border-color: var(--accent); }
    .inp::placeholder { color: var(--muted); }

    /* Section labels */
    .section-label { font-size: 9px; color: var(--muted); letter-spacing: 2px; font-family: var(--mono); margin-bottom: 12px; text-transform: uppercase; }

    /* Detail view */
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .detail-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .stat-box { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; }
    .stat-label { font-size: 9px; color: var(--muted); letter-spacing: 1.5px; font-family: var(--mono); margin-bottom: 6px; }
    .stat-value { font-size: 20px; font-weight: 600; font-family: var(--mono); }
    .stat-sub { font-size: 11px; color: var(--muted); margin-top: 3px; }

    /* Progress bar */
    .prog-bar { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; margin-top: 6px; }
    .prog-fill { height: 100%; border-radius: 2px; transition: width 0.5s; }

    /* Scenario bars */
    .scenario-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
    .scenario-label { font-family: var(--mono); font-size: 10px; font-weight: 700; width: 40px; }
    .scenario-bar { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
    .scenario-fill { height: 100%; border-radius: 3px; }
    .scenario-price { font-family: var(--mono); font-size: 12px; font-weight: 600; width: 80px; text-align: right; }
    .scenario-prob { font-family: var(--mono); font-size: 10px; color: var(--muted); width: 35px; text-align: right; }

    /* Key points */
    .key-point { display: flex; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--border)88; }
    .key-no { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--accent); min-width: 22px; }
    .key-label { font-size: 10px; color: var(--muted); font-family: var(--mono); margin-bottom: 3px; }
    .key-content { font-size: 12px; color: var(--text); line-height: 1.6; }

    /* Comps table */
    .comps-table { width: 100%; border-collapse: collapse; font-family: var(--mono); font-size: 11px; }
    .comps-table th { text-align: left; padding: 8px 10px; color: var(--muted); font-size: 9px; letter-spacing: 1px; border-bottom: 1px solid var(--border); font-weight: 400; }
    .comps-table td { padding: 9px 10px; border-bottom: 1px solid var(--border)44; }
    .comps-table tr:last-child td { border-bottom: none; }
    .comps-table tr.highlight td { color: var(--accent); }

    /* Filters */
    .filter-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }
    .filter-chip { font-size: 11px; padding: 5px 12px; border-radius: 20px; border: 1px solid var(--border); background: transparent; color: var(--muted2); cursor: pointer; transition: all 0.15s; font-family: var(--mono); }
    .filter-chip.active { background: var(--accent)22; border-color: var(--accent)88; color: var(--accent); }
    .search-inp { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 7px 14px; border-radius: 6px; font-size: 12px; outline: none; width: 200px; }
    .search-inp:focus { border-color: var(--border2); }
    .search-inp::placeholder { color: var(--muted); }

    /* Deal radar */
    .deal-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border)44; }
    .deal-status { font-size: 9px; font-family: var(--mono); padding: 2px 6px; border-radius: 3px; white-space: nowrap; margin-top: 1px; }

    /* Reliability */
    .check-row { display: flex; align-items: flex-start; gap: 8px; font-size: 11px; padding: 5px 0; color: var(--muted2); }

    /* Price events */
    .event-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border)44; }

    /* Analyze view */
    .analyze-box { max-width: 600px; margin: 60px auto 0; }
    .analyze-title { font-family: var(--serif); font-size: 32px; font-weight: 300; color: var(--text); margin-bottom: 8px; }
    .analyze-sub { font-size: 13px; color: var(--muted); margin-bottom: 36px; line-height: 1.6; }
    .depth-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .depth-card { border: 2px solid var(--border); border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s; }
    .depth-card.active { border-color: var(--accent); background: var(--accent)0d; }
    .loading-steps { font-family: var(--mono); font-size: 12px; color: var(--muted2); }
    .loading-step { padding: 4px 0; transition: color 0.3s; }
    .loading-step.active { color: var(--accent); }
    .loading-step.done { color: var(--green); }

    /* Overlay modal */
    .overlay { position: fixed; inset: 0; background: #00000080; backdrop-filter: blur(4px); z-index: 999; display: flex; align-items: center; justify-content: center; }
    .modal { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 28px; width: 360px; }

    /* Stats row */
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .stats-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; }
    .stats-num { font-family: var(--mono); font-size: 28px; font-weight: 700; }
    .stats-label { font-size: 10px; color: var(--muted); letter-spacing: 1px; margin-top: 2px; font-family: var(--mono); }

    /* Top bar */
    .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-title { font-family: var(--serif); font-size: 26px; font-weight: 300; }

    /* Tabs */
    .tabs { display: flex; gap: 2px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 3px; margin-bottom: 20px; }
    .tab { flex: 1; text-align: center; padding: 7px; font-size: 11px; font-family: var(--mono); color: var(--muted); border-radius: 5px; cursor: pointer; transition: all 0.15s; }
    .tab.active { background: var(--card); color: var(--text); }

    /* Quant scores */
    .score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .score-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; }
    .score-name { font-size: 9px; color: var(--muted); letter-spacing: 1.5px; font-family: var(--mono); margin-bottom: 6px; }
    .score-num { font-family: var(--mono); font-size: 24px; font-weight: 700; }
    .score-max { font-size: 11px; color: var(--muted); }

    /* Mobile */
    .mobile-bottom-nav { display: none; }

    @media (max-width: 768px) {
      .sidebar { display: none; }
      .main { margin-left: 0; padding: 16px; padding-bottom: 80px; }
      .stats-row { grid-template-columns: 1fr 1fr; }
      .stock-grid { grid-template-columns: 1fr; }
      .detail-grid { grid-template-columns: 1fr; }
      .detail-grid-3 { grid-template-columns: 1fr; }
      .score-grid { grid-template-columns: 1fr 1fr; }
      .analyze-box { margin-top: 20px; }
      .mobile-bottom-nav { display: flex; position: fixed; bottom: 0; left: 0; right: 0; background: var(--surface); border-top: 1px solid var(--border); z-index: 100; }
      .mobile-tab { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 10px 0; font-size: 9px; color: var(--muted); letter-spacing: 1px; font-family: var(--mono); gap: 3px; cursor: pointer; }
      .mobile-tab.active { color: var(--accent); }
      .mobile-tab-icon { font-size: 18px; }
    }

    /* Animations */
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    .fade-in { animation: fadeIn 0.3s ease; }
    .pulsing { animation: pulse 1.5s infinite; }
    .spinning { animation: spin 1s linear infinite; display: inline-block; }
  `;

  // ── 대시보드 ─────────────────────────────────────────────────
  const Dashboard = () => {
    const buyCount = stocks.filter(s => ["STRONG BUY","BUY"].includes(s.ib?.verdict)).length;
    const holdCount = stocks.filter(s => s.ib?.verdict === "HOLD").length;
    const avoidCount = stocks.filter(s => ["REDUCE","AVOID"].includes(s.ib?.verdict)).length;
    const avgUpside = stocks.length
      ? (stocks.reduce((a,s) => a + (parseFloat(s.ib?.upsideDownside) || 0), 0) / stocks.length).toFixed(1)
      : 0;

    return (
      <div className="fade-in">
        <div className="topbar">
          <div>
            <div className="page-title">Research Desk</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, fontFamily: "var(--mono)" }}>
              {stocks.length}개 종목 · {new Date().toLocaleDateString("ko-KR")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isAdmin && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setView("settings")}>⚙</button>
                <button className="btn btn-primary btn-sm" onClick={() => setView("analyze")}>🤖 AI 분석</button>
              </>
            )}
            {!isAdmin && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPwModal(true)}>🔑 관리자</button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          {[
            { label: "TOTAL", value: stocks.length, color: "var(--text)" },
            { label: "BUY", value: buyCount, color: "var(--green)" },
            { label: "HOLD", value: holdCount, color: "var(--accent)" },
            { label: "AVG UPSIDE", value: fmtPct(avgUpside), color: avgUpside > 0 ? "var(--green)" : "var(--red)" },
          ].map(s => (
            <div key={s.label} className="stats-card">
              <div className="stats-num" style={{ color: s.color }}>{s.value}</div>
              <div className="stats-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="filter-row">
          <input className="search-inp" placeholder="종목 검색..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
          {["ALL","STRONG BUY","BUY","HOLD","REDUCE","AVOID"].map(v => (
            <button key={v} className={`filter-chip ${filterVerdict === v ? "active" : ""}`} onClick={() => setFilterVerdict(v)}>
              {v === "ALL" ? "전체" : v}
            </button>
          ))}
          <select className="filter-chip" style={{ cursor: "pointer" }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="date">최신순</option>
            <option value="upside">업사이드순</option>
            <option value="quality">퀄리티순</option>
            <option value="mos">MOS순</option>
          </select>
          {isAdmin && (
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}
              onClick={() => { setEditTarget(null); setView("manual-add"); }}>+ 직접 추가</button>
          )}
        </div>

        {/* Stock Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>아직 분석된 종목이 없어요</div>
            {isAdmin && <button className="btn btn-primary" onClick={() => setView("analyze")}>첫 종목 분석하기</button>}
          </div>
        ) : (
          <div className="stock-grid">
            {filtered.map(s => <StockCard key={s.id} stock={s} onClick={() => { setSelected(s); setView("detail"); }} />)}
          </div>
        )}
      </div>
    );
  };

  // ── 종목 카드 ────────────────────────────────────────────────
  const StockCard = ({ stock, onClick }) => {
    const vm = verdictMeta[stock.ib?.verdict] || verdictMeta["HOLD"];
    const upside = stock.ib?.upsideDownside;
    const mos = stock.quant?.valuation?.marginOfSafety;
    const hasDeals = stock.ib?.dealRadar?.items?.length > 0;

    return (
      <div className="stock-card fade-in" style={{ "--verdict-color": vm.color }} onClick={onClick}>
        {/* Header */}
        <div className="stock-card-header">
          <div>
            <div className="stock-ticker">{stock.ticker}</div>
            <div className="stock-name">{stock.name} · {stock.sector}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <span className="verdict-tag" style={{ background: vm.bg, color: vm.color }}>{vm.label}</span>
            {hasDeals && <span className="deal-badge">딜 감지</span>}
          </div>
        </div>

        {/* Metrics */}
        <div className="stock-metrics">
          <div className="metric">
            <div className="metric-label">현재가</div>
            <div className="metric-value">{fmtPrice(stock.currentPrice, stock.currency)}</div>
          </div>
          <div className="metric">
            <div className="metric-label">적정가</div>
            <div className="metric-value" style={{ color: "var(--accent)" }}>
              {fmtPrice(stock.ib?.weightedFairValue, stock.currency)}
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">업사이드</div>
            <div className="metric-value" style={{ color: upside > 0 ? "var(--green)" : upside < 0 ? "var(--red)" : "var(--text)" }}>
              {fmtPct(upside)}
            </div>
          </div>
        </div>

        {/* Score pills */}
        <div className="stock-scores">
          {mos !== undefined && mos !== null && (
            <div className="score-pill">
              <div className="score-dot" style={{ background: mos > 30 ? "var(--green)" : mos > 15 ? "var(--accent)" : "var(--red)" }} />
              MOS {fmtPct(mos, false)}
            </div>
          )}
          {stock.quant?.verdict?.qualityScore !== undefined && (
            <div className="score-pill">
              <div className="score-dot" style={{ background: stock.quant.verdict.qualityScore > 70 ? "var(--green)" : "var(--accent)" }} />
              Q {stock.quant.verdict.qualityScore}
            </div>
          )}
          {stock.quant?.macro?.environment && (
            <div className="score-pill">
              <div className="score-dot" style={{ background: macroColor[stock.quant.macro.environment] || "var(--muted)" }} />
              매크로 {stock.quant.macro.environment}
            </div>
          )}
          {stock.quant?.fundamental?.moatRating && (
            <div className="score-pill">
              <div className="score-dot" style={{ background: moatColor[stock.quant.fundamental.moatRating] || "var(--muted)" }} />
              해자 {stock.quant.fundamental.moatRating}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--mono)" }}>
            {stock.analyzedAt?.slice(0, 10)}
          </div>
          <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--muted)" }}>
            신뢰도 {stars(stock.ib?.confidence || 60)}
          </div>
        </div>
      </div>
    );
  };

  // ── AI 분석 뷰 ──────────────────────────────────────────────
  const AnalyzeView = () => {
    const [company, setCompany] = useState("");
    const [depth, setDepth] = useState("deep");
    const [loading, setLoading] = useState(false);
    const [phase, setPhase] = useState(0); // 0=idle 1=quant 2=ib 3=done
    const [error, setError] = useState("");

    const PHASES = [
      { label: "대기 중", icon: "○" },
      { label: "1단계: 퀀트 분석 중... (매크로·재무·밸류에이션)", icon: "◐" },
      { label: "2단계: IB 분석 중... (딜레이더·DCF·Comps·시나리오)", icon: "◑" },
      { label: "분석 완료", icon: "●" },
    ];

    const analyze = async () => {
      if (!company.trim()) return;
      if (!anthropicKey) { setError("설정에서 Anthropic API 키를 먼저 입력해주세요"); return; }
      setLoading(true); setError(""); setPhase(1);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyName: company, anthropicKey, depth }),
        });
        setPhase(2);
        const data = await res.json();
        if (data.error) { setError(data.error); setPhase(0); setLoading(false); return; }
        setPhase(3);

        const newStock = { ...data, id: Date.now().toString() };
        const updated = [newStock, ...stocks];
        save(updated);
        setSelected(newStock);
        setTimeout(() => { setView("detail"); }, 800);
      } catch(e) {
        setError(e.message);
        setPhase(0);
      }
      setLoading(false);
    };

    return (
      <div className="fade-in">
        <div className="topbar">
          <div>
            <div className="page-title">AI 분석</div>
            <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 2 }}>
              퀀트 트레이더 × IB 분석가 2단계 분석
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setView("dashboard")}>← 뒤로</button>
        </div>

        <div className="analyze-box">
          {/* Depth */}
          <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 2, fontFamily: "var(--mono)", marginBottom: 12 }}>ANALYSIS DEPTH</div>
          <div className="depth-grid" style={{ marginBottom: 24 }}>
            {[
              { value: "quick", icon: "⚡", label: "Quick", desc: "핵심만 · 40~60초", info: "웹검색 3~4회" },
              { value: "deep",  icon: "🔬", label: "Deep",  desc: "심층 분석 · 90~150초", info: "웹검색 6~8회" },
            ].map(d => (
              <div key={d.value} className={`depth-card ${depth === d.value ? "active" : ""}`} onClick={() => !loading && setDepth(d.value)}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{d.icon}</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.label}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{d.desc}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 4 }}>{d.info}</div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <input className="inp" placeholder="기업명 또는 티커 (예: 삼성전자 / NVDA / TSMC)"
              value={company} onChange={e => setCompany(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !loading && analyze()}
              disabled={loading} autoFocus />
            <button className="btn btn-primary" style={{ whiteSpace: "nowrap", padding: "10px 20px" }}
              onClick={analyze} disabled={loading || !company.trim()}>
              {loading ? <span className="spinning">◐</span> : "분석 시작"}
            </button>
          </div>

          {/* Phase indicator */}
          {loading && (
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <div className="loading-steps">
                {PHASES.slice(1).map((p, i) => (
                  <div key={i} className={`loading-step ${phase === i+1 ? "active pulsing" : phase > i+1 ? "done" : ""}`}>
                    {phase > i+1 ? "✓" : phase === i+1 ? "◐" : "○"} {p.label}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, height: 2, background: "var(--border)", borderRadius: 1, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "var(--accent)", borderRadius: 1, width: `${(phase / 3) * 100}%`, transition: "width 0.5s" }} />
              </div>
            </div>
          )}

          {error && <div style={{ color: "var(--red)", fontSize: 12, padding: "12px 16px", background: "#ef444410", border: "1px solid #ef444430", borderRadius: 6 }}>{error}</div>}

          {/* 분석 포함 항목 */}
          {!loading && (
            <div style={{ marginTop: 28, padding: 20, background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 9, color: "var(--muted)", letterSpacing: 2, fontFamily: "var(--mono)", marginBottom: 14 }}>분석에 포함되는 항목</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  ["퀀트", "매크로 환경 분석 (금리·GDP·사이클)"],
                  ["퀀트", "산업 구조 + Porter's Five Forces"],
                  ["퀀트", "10년 재무 추이 (ROE·ROIC·FCF)"],
                  ["퀀트", "밸류에이션 역사적 백분위"],
                  ["IB", "딜 레이더 (M&A·IPO·규제)"],
                  ["IB", "DCF + 비교기업 Comps"],
                  ["IB", "Bull/Base/Bear 시나리오"],
                  ["IB", "10 Key Points + 역산 검증"],
                ].map(([tag, item]) => (
                  <div key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11, color: "var(--muted2)" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, padding: "1px 5px", borderRadius: 3,
                      background: tag === "퀀트" ? "#3b82f618" : "#8b5cf618",
                      color: tag === "퀀트" ? "var(--blue)" : "var(--purple)", flexShrink: 0 }}>{tag}</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── 상세 뷰 ─────────────────────────────────────────────────
  const [detailTab, setDetailTab] = useState("overview");
  const [editTarget, setEditTarget] = useState(null);

  const DetailView = ({ stock }) => {
    if (!stock) return null;
    const vm = verdictMeta[stock.ib?.verdict] || verdictMeta["HOLD"];
    const sc = stock.ib?.scenarios;
    const q = stock.quant;
    const ib = stock.ib;

    const deleteStock = () => {
      const updated = stocks.filter(s => s.id !== stock.id);
      save(updated);
      setSelected(null);
      setView("dashboard");
    };

    return (
      <div className="fade-in">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700 }}>{stock.ticker}</div>
              <span className="verdict-tag" style={{ background: vm.bg, color: vm.color, fontSize: 11, padding: "5px 10px" }}>{vm.label}</span>
              {ib?.dealRadar?.items?.length > 0 && <span className="deal-badge" style={{ fontSize: 10 }}>🔍 딜 감지</span>}
            </div>
            <div style={{ fontSize: 14, color: "var(--muted2)" }}>{stock.name} · {stock.sector} · {stock.exchange}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", marginTop: 4 }}>
              분석: {stock.analyzedAt} · 신뢰도 {stars(ib?.confidence || 60)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setView("dashboard")}>← 목록</button>
            {isAdmin && <button className="btn btn-danger btn-sm" onClick={deleteStock}>삭제</button>}
          </div>
        </div>

        {/* Price summary */}
        <div className="detail-grid-3" style={{ marginBottom: 20 }}>
          {[
            { label: "현재가", value: fmtPrice(stock.currentPrice, stock.currency), color: "var(--text)" },
            { label: "확률가중 적정가", value: fmtPrice(ib?.weightedFairValue, stock.currency), color: "var(--accent)" },
            { label: "업사이드", value: fmtPct(ib?.upsideDownside), color: (ib?.upsideDownside || 0) > 0 ? "var(--green)" : "var(--red)" },
            { label: "MOS", value: fmtPct(q?.valuation?.marginOfSafety, false), color: (q?.valuation?.marginOfSafety || 0) > 30 ? "var(--green)" : "var(--accent)" },
            { label: "DCF 적정가", value: fmtPrice(ib?.dcf?.fairValue, stock.currency), color: "var(--text)" },
            { label: "Comps 적정가", value: fmtPrice(ib?.comps?.impliedValue, stock.currency), color: "var(--text)" },
          ].map(m => (
            <div key={m.label} className="stat-box">
              <div className="stat-label">{m.label}</div>
              <div className="stat-value" style={{ color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { key: "overview", label: "개요" },
            { key: "quant", label: "퀀트" },
            { key: "ib", label: "IB 분석" },
            { key: "keypoints", label: "10 Key Points" },
            { key: "comps", label: "Comps" },
          ].map(t => (
            <div key={t.key} className={`tab ${detailTab === t.key ? "active" : ""}`} onClick={() => setDetailTab(t.key)}>{t.label}</div>
          ))}
        </div>

        {/* Tab: Overview */}
        {detailTab === "overview" && (
          <div className="fade-in">
            {/* One-liner */}
            {ib?.verdictOneLiner && (
              <div style={{ padding: "16px 20px", background: `${vm.color}12`, border: `1px solid ${vm.color}30`, borderRadius: 8, marginBottom: 16, fontSize: 13, lineHeight: 1.7, color: "var(--text)" }}>
                💬 {ib.verdictOneLiner}
              </div>
            )}

            {/* Scenarios */}
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <div className="section-label">시나리오</div>
              {[
                { key: "bull", label: "BULL", color: "var(--green)", data: sc?.bull },
                { key: "base", label: "BASE", color: "var(--accent)", data: sc?.base },
                { key: "bear", label: "BEAR", color: "var(--red)", data: sc?.bear },
              ].map(s => s.data && (
                <div key={s.key} className="scenario-row">
                  <div className="scenario-label" style={{ color: s.color }}>{s.label}</div>
                  <div className="scenario-bar">
                    <div className="scenario-fill" style={{ width: `${s.data.prob}%`, background: s.color }} />
                  </div>
                  <div className="scenario-price" style={{ color: s.color }}>{fmtPrice(s.data.price, stock.currency)}</div>
                  <div className="scenario-prob">{s.data.prob}%</div>
                </div>
              ))}
              <div style={{ marginTop: 14, fontSize: 11, color: "var(--muted2)", lineHeight: 1.6 }}>
                {sc?.base?.thesis}
              </div>
            </div>

            {/* Price events */}
            {ib?.priceEvents?.length > 0 && (
              <div className="card" style={{ padding: 20, marginBottom: 16 }}>
                <div className="section-label">이벤트별 주가 영향</div>
                {ib.priceEvents.map((e, i) => (
                  <div key={i} className="event-row">
                    <div style={{ fontSize: 12, color: "var(--text)" }}>{e.event}</div>
                    <div style={{ display: "flex", align: "center", gap: 12, fontFamily: "var(--mono)" }}>
                      <span style={{ fontSize: 12, color: e.impact > 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                        {e.impact > 0 ? "+" : ""}{e.impact}%
                      </span>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{e.impactPrice ? fmtPrice(e.impactPrice, stock.currency) : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Deal radar */}
            {ib?.dealRadar && (
              <div className="card" style={{ padding: 20 }}>
                <div className="section-label">🔍 딜 레이더</div>
                {ib.dealRadar.items?.length > 0 ? (
                  ib.dealRadar.items.map((d, i) => (
                    <div key={i} className="deal-row">
                      <span className="deal-status" style={{
                        background: d.status === "공식발표" ? "#10b98118" : d.status === "루머" ? "#f59e0b18" : "#3b82f618",
                        color: d.status === "공식발표" ? "var(--green)" : d.status === "루머" ? "var(--accent)" : "var(--blue)",
                      }}>{d.status}</span>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--text)", marginBottom: 3 }}>{d.title}</div>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>{d.impact} · {d.valImpact}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>현재 확인된 주요 딜 현안 없음</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Quant */}
        {detailTab === "quant" && q && (
          <div className="fade-in">
            {/* Scores */}
            <div className="score-grid" style={{ marginBottom: 16 }}>
              {[
                { label: "QUALITY", value: q.verdict?.qualityScore, max: 100, color: "var(--green)" },
                { label: "VALUE", value: q.verdict?.valueScore, max: 100, color: "var(--blue)" },
                { label: "MOMENTUM", value: q.verdict?.momentumScore, max: 100, color: "var(--purple)" },
              ].map(s => (
                <div key={s.label} className="score-card">
                  <div className="score-name">{s.label}</div>
                  <div className="score-num" style={{ color: s.color }}>
                    {s.value ?? "—"}<span className="score-max">/100</span>
                  </div>
                  <div className="prog-bar">
                    <div className="prog-fill" style={{ width: `${s.value || 0}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Macro */}
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <div className="section-label">매크로 환경</div>
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: macroColor[q.macro?.environment] || "var(--muted)" }}>
                  {q.macro?.environment}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>
                  사이클: {q.macro?.cyclePosition}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted2)", lineHeight: 1.7, marginBottom: 12 }}>{q.macro?.summary}</div>
              {q.macro?.keyRisks?.length > 0 && (
                <div style={{ fontSize: 11, color: "var(--red)" }}>
                  ⚠️ {q.macro.keyRisks.join(" · ")}
                </div>
              )}
            </div>

            {/* Fundamental */}
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <div className="section-label">기업 본질 분석</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                {[
                  { label: "ROE", value: fmtPct(q.fundamental?.roe, false) },
                  { label: "ROIC", value: fmtPct(q.fundamental?.roic, false) },
                  { label: "영업이익률", value: fmtPct(q.fundamental?.operatingMargin, false) },
                  { label: "5Y 매출성장", value: fmtPct(q.fundamental?.revenueGrowth5Y, false) },
                  { label: "FCF 전환율", value: fmtPct(q.fundamental?.fcfConversion, false) },
                  { label: "부채비율", value: fmtPct(q.fundamental?.debtRatio, false) },
                ].map(m => (
                  <div key={m.label} className="stat-box">
                    <div className="stat-label">{m.label}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 600 }}>{m.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div className="score-pill">해자 <span style={{ color: moatColor[q.fundamental?.moatRating] }}>{q.fundamental?.moatRating}</span></div>
                <div className="score-pill">수익안정성 {q.fundamental?.earningsStability}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted2)", lineHeight: 1.7 }}>{q.fundamental?.moatEvidence}</div>
            </div>

            {/* Valuation */}
            <div className="card" style={{ padding: 20 }}>
              <div className="section-label">밸류에이션</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                {[
                  { label: "P/E", value: q.valuation?.per },
                  { label: "P/B", value: q.valuation?.pbr },
                  { label: "EV/EBITDA", value: q.valuation?.evEbitda },
                  { label: "FCF Yield", value: q.valuation?.fcfYield ? fmtPct(q.valuation.fcfYield, false) : "—" },
                ].map(m => (
                  <div key={m.label} className="stat-box">
                    <div className="stat-label">{m.label}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 600 }}>
                      {typeof m.value === "number" ? m.value.toFixed(1) + "x" : (m.value || "—")}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 20, fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 12 }}>
                <span>역사적 백분위: <span style={{ color: "var(--text)" }}>{q.valuation?.historicalPercentile}%</span></span>
                <span>업종 백분위: <span style={{ color: "var(--text)" }}>{q.valuation?.industryPercentile}%</span></span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted2)", lineHeight: 1.7 }}>{q.valuation?.summary}</div>
            </div>
          </div>
        )}

        {/* Tab: IB */}
        {detailTab === "ib" && ib && (
          <div className="fade-in">
            {/* DCF */}
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <div className="section-label">DCF 모델</div>
              <div style={{ display: "flex", gap: 20, marginBottom: 14, fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)" }}>
                <span>WACC <span style={{ color: "var(--text)" }}>{fmtPct(ib.dcf?.wacc, false)}</span></span>
                <span>터미널 성장률 <span style={{ color: "var(--text)" }}>{fmtPct(ib.dcf?.terminalGrowth, false)}</span></span>
                <span>DCF 적정가 <span style={{ color: "var(--accent)" }}>{fmtPrice(ib.dcf?.fairValue, stock.currency)}</span></span>
              </div>
              {ib.dcf?.assumptions?.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "var(--mono)" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["가정 항목","적용값","근거","민감도"].map(h => (
                        <th key={h} style={{ padding: "6px 10px", color: "var(--muted)", fontWeight: 400, textAlign: "left", fontSize: 9, letterSpacing: 1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ib.dcf.assumptions.map((a, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)44" }}>
                        <td style={{ padding: "8px 10px", color: "var(--muted2)" }}>{a.item}</td>
                        <td style={{ padding: "8px 10px", color: "var(--accent)" }}>{a.value}</td>
                        <td style={{ padding: "8px 10px", color: "var(--muted)" }}>{a.basis}</td>
                        <td style={{ padding: "8px 10px", color: "var(--muted)" }}>{a.sensitivity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Reverse check */}
            {ib.reverseCheck && (
              <div className="card" style={{ padding: 20, marginBottom: 16 }}>
                <div className="section-label">역산 검증</div>
                <div style={{ display: "flex", gap: 20, fontSize: 12, fontFamily: "var(--mono)", color: "var(--muted)", marginBottom: 8 }}>
                  <span>내재 성장률 <span style={{ color: "var(--text)" }}>{ib.reverseCheck.impliedGrowth}</span></span>
                  <span>시장 비교 <span style={{ color: "var(--text)" }}>{ib.reverseCheck.vsMarket}</span></span>
                </div>
                {ib.reverseCheck.warning && (
                  <div style={{ fontSize: 11, color: "var(--accent)", background: "var(--accent)10", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--accent)30" }}>
                    ⚠️ {ib.reverseCheck.warning}
                  </div>
                )}
              </div>
            )}

            {/* Reliability */}
            {ib.reliability && (
              <div className="card" style={{ padding: 20 }}>
                <div className="section-label">📋 신뢰도 체크리스트</div>
                <div className="check-row">📌 실제 데이터: {ib.reliability.realDataSources?.join(", ")}</div>
                <div className="check-row">📊 추정/가정 비율: {ib.reliability.estimateRatio}</div>
                {ib.reliability.topUncertainties?.map((u, i) => (
                  <div key={i} className="check-row">⚠️ {u}</div>
                ))}
                {ib.reliability.limitations && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>{ib.reliability.limitations}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: 10 Key Points */}
        {detailTab === "keypoints" && ib?.keyPoints && (
          <div className="fade-in">
            <div className="card" style={{ padding: 20 }}>
              <div className="section-label">🎯 {stock.ticker} 분석 핵심 인사이트 10 Key Points</div>
              {ib.keyPoints.map((kp, i) => (
                <div key={i} className="key-point">
                  <div className="key-no">①②③④⑤⑥⑦⑧⑨⑩".split("").filter(c => c.codePointAt(0) > 9311)[i] || `${i+1}`}</div>
                  <div>
                    <div className="key-label">{kp.label}</div>
                    <div className="key-content">{kp.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Comps */}
        {detailTab === "comps" && ib?.comps && (
          <div className="fade-in">
            <div className="card" style={{ padding: 20 }}>
              <div className="section-label">비교기업 분석 (Trading Comps)</div>
              <div style={{ display: "flex", gap: 20, fontSize: 12, fontFamily: "var(--mono)", color: "var(--muted)", marginBottom: 16 }}>
                <span>Comps 적정가 <span style={{ color: "var(--accent)" }}>{fmtPrice(ib.comps.impliedValue, stock.currency)}</span></span>
                <span>프리미엄/디스카운트 <span style={{ color: "var(--text)" }}>{fmtPct(ib.comps.premiumDiscount)}</span></span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="comps-table">
                  <thead>
                    <tr>
                      {["기업","티커","P/E","EV/EBITDA","P/B","매출성장"].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {ib.comps.peers?.map((p, i) => (
                      <tr key={i} className={p.ticker === stock.ticker ? "highlight" : ""}>
                        <td>{p.name}</td>
                        <td>{p.ticker}</td>
                        <td>{p.per ? p.per.toFixed(1) + "x" : "—"}</td>
                        <td>{p.evEbitda ? p.evEbitda.toFixed(1) + "x" : "—"}</td>
                        <td>{p.pbr ? p.pbr.toFixed(1) + "x" : "—"}</td>
                        <td style={{ color: (p.revenueGrowth || 0) > 0 ? "var(--green)" : "var(--red)" }}>
                          {fmtPct(p.revenueGrowth)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: "var(--muted2)", lineHeight: 1.7 }}>{ib.comps.summary}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Settings ─────────────────────────────────────────────────
  const SettingsView = () => (
    <div className="fade-in">
      <div className="topbar">
        <div className="page-title">설정</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setView("dashboard")}>← 뒤로</button>
      </div>
      <div style={{ maxWidth: 480 }}>
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <div className="section-label">ANTHROPIC API KEY</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>AI 분석에 사용됩니다 (Claude claude-opus-4-6)</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="inp" type="password" placeholder="sk-ant-..." value={keyInput} onChange={e => setKeyInput(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={saveKey}>저장</button>
          </div>
          {anthropicKey && <div style={{ fontSize: 10, color: "var(--green)", fontFamily: "var(--mono)", marginTop: 8 }}>✓ 키 등록됨</div>}
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <div className="section-label">데이터 관리</div>
          <button className="btn btn-danger btn-sm" onClick={() => {
            if (confirm("모든 분석 데이터를 삭제할까요?")) {
              save([]);
              setSelected(null);
              setView("dashboard");
            }
          }}>전체 데이터 초기화</button>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div className="section-label">관리자 접속 링크</div>
          <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--muted2)", lineHeight: 2 }}>
            <div>?key=haks-admin</div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── 렌더 ─────────────────────────────────────────────────────
  const navItems = [
    { key: "dashboard", icon: "📊", label: "대시보드", badge: stocks.length || null },
    ...(isAdmin ? [{ key: "analyze", icon: "🤖", label: "AI 분석" }] : []),
    { key: "compare", icon: "⚖", label: "비교" },
    ...(isAdmin ? [{ key: "settings", icon: "⚙", label: "설정" }] : []),
  ];

  const renderView = () => {
    if (view === "dashboard") return <Dashboard />;
    if (view === "analyze" && isAdmin) return <AnalyzeView />;
    if (view === "detail" && selected) return <DetailView stock={selected} />;
    if (view === "settings") return <SettingsView />;
    return <Dashboard />;
  };

  return (
    <>
      <style>{css}</style>

      {/* Admin password modal */}
      {showPwModal && (
        <div className="overlay" onClick={() => setShowPwModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 20, marginBottom: 4 }}>관리자 로그인</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20 }}>비밀번호를 입력하세요</div>
            <input className="inp" type="password" placeholder="••••••••" value={pwInput}
              onChange={e => setPwInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdminLogin()}
              style={{ marginBottom: 8, border: pwError ? "1px solid var(--red)" : undefined }}
              autoFocus />
            {pwError && <div style={{ fontSize: 11, color: "var(--red)", marginBottom: 8 }}>비밀번호가 틀렸어요</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setShowPwModal(false)}>취소</button>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleAdminLogin}>로그인</button>
            </div>
          </div>
        </div>
      )}

      <div className="layout">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="logo">
            <div className="logo-text">AnalystOS</div>
            <div className="logo-sub">RESEARCH PLATFORM v2</div>
          </div>
          <nav className="nav">
            {navItems.map(item => (
              <div key={item.key} className={`nav-item ${view === item.key ? "active" : ""}`}
                onClick={() => setView(item.key)}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            {isAdmin ? (
              <div className="admin-badge" style={{ background: "var(--accent)18", color: "var(--accent)", border: "1px solid var(--accent)30" }}>
                ★ ADMIN
              </div>
            ) : (
              <div className="admin-badge" style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)", cursor: "pointer" }}
                onClick={() => setShowPwModal(true)}>
                🔑 관리자 로그인
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <main className="main">
          {renderView()}
        </main>

        {/* Mobile bottom nav */}
        <div className="mobile-bottom-nav">
          {navItems.map(item => (
            <div key={item.key} className={`mobile-tab ${view === item.key ? "active" : ""}`}
              onClick={() => setView(item.key)}>
              <span className="mobile-tab-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
