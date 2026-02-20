import React, { useState, useEffect, useRef } from "react";

// Alpha Vantage: fetch real-time price for a ticker
// For KR stocks use ticker like "005930.KS" (Samsung)
async function fetchLivePrice(ticker, market, apiKey) {
  try {
    const res = await fetch("/api/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, market, apiKey }),
    });
    const data = await res.json();
    if (data.price && data.price > 0) return data.price;
    return null;
  } catch { return null; }
}

const INITIAL_STOCKS = [
  {
    id: "t1energy",
    ticker: "TE",
    name: "T1 ENERGY",
    market: "US",
    exchange: "NASDAQ",
    sector: "Solar & Battery",
    currentPrice: 6.46,
    fairValue: 10.50,
    currency: "USD",
    verdict: "Selective Buy",
    verdictType: "buy",
    oneLiner: "Current price already prices in base-case execution + IRA/FEOC tailwinds + domestic content edge. Risk-reward skewed positive on catalysts (G2 commercialization + tax credit true-up), but leverage and dilution remain material headwinds.",
    narrative: "Market prices T1 Energy as a leading U.S.-onshored solar module/cell + battery solutions player, leveraging IRA Section 45X credits and FEOC compliance to capture surging domestic demand from AI/data centers, utilities, and electrification. G1 Dallas (5GW modules fully ramped) + G2 Austin (2.1GW TOPCon cells, construction underway, 2026E commercialization) form core moat.",
    keyPoints: [
      { num: 1, label: "종합 판단", content: "Undervalued high-conviction growth name with policy + demand tailwinds; execution track record key to realizing upside." },
      { num: 2, label: "DCF 인사이트", content: "2026 revenue ramp to ~$1.1B 후 margin expansion 시 NPV strongly accretive; WACC sensitivity high." },
      { num: 3, label: "Comps 인사이트", content: "Peers (ARRY, SHLS 등) 평균 P/S 3.5x 적용 시 $12+ potential, but current losses warrant 20-30% discount." },
      { num: 4, label: "시나리오 핵심", content: "Bull (G2 on-time + big PPA): $15+; Base (steady ramp): $10-11; Bear (delay/dilution): $5 이하." },
      { num: 5, label: "가장 중요한 변수", content: "G2 Austin 2026 commercialization timeline – 3~6개월 지연 시 valuation -25~40%." },
      { num: 6, label: "시장이 놓치는 것", content: "February 2026 45X true-up cash inflow potential + FEOC compliance premium 과소평가." },
      { num: 7, label: "최대 리스크", content: "Debt load + potential further equity/debt raises for capex → dilution pressure." },
      { num: 8, label: "딜 레이더", content: "Director M&A Incentive RSU amendment – M&A 촉진 신호." },
      { num: 9, label: "업사이드 촉매", content: "G2 progress update / Q1 2026 earnings (신뢰도 높음, on-track IR)." },
      { num: 10, label: "액션 아이템", content: "2월 말 45X true-up announcement + March earnings call transcript 점검." },
    ],
    dealRadar: "Director Consulting Agreement Amendment + $250K M&A Incentive RSU — 공식발표 (TipRanks / MarketWatch 2026-02-11), M&A advisory 강화로 잠재 거래 촉매. Treasury FEOC Guidance reaffirmation — 공식 (Seeking Alpha 2026-02-17), 45X eligibility 확정으로 현금 유입 안정화.",
    scenarios: [
      { type: "Bull", prob: 35, price: 15.00, color: "#00d27a" },
      { type: "Base", prob: 45, price: 10.50, color: "#f5a623" },
      { type: "Bear", prob: 20, price: 5.00, color: "#e74c3c" },
    ],
    weightedFV: 11.00,
    events: [
      { event: "G2 Austin 2026 상업화 on-schedule 발표", impact: "+35%", direction: "up" },
      { event: "45X true-up $160M+ positive finalization", impact: "+20%", direction: "up" },
      { event: "추가 equity/debt financing 규모 확대", impact: "-25%", direction: "down" },
      { event: "Utility/AI data center 대형 PPA 체결", impact: "+50%", direction: "up" },
      { event: "금리 상승 + refinancing pressure", impact: "-30%", direction: "down" },
    ],
    assumptions: [
      { item: "WACC", value: "11.5%", basis: "Beta ~1.6 기반", sensitivity: "±1% → 가치 ±12%" },
      { item: "Terminal Growth Rate", value: "3%", basis: "Clean energy 장기 평균", sensitivity: "±1% → 가치 ±18%" },
      { item: "2027-2029 Revenue CAGR", value: "30%", basis: "IRA + domestic demand 전망", sensitivity: "±10% → 가치 ±25%" },
      { item: "Operating Margin (2028E)", value: "10%", basis: "손실 축소 후 목표치", sensitivity: "±5% → 가치 ±20%" },
    ],
    updatedAt: "2026-02-18",
    sources: ["Yahoo Finance", "IR.t1energy.com", "MarketBeat", "TradingView", "Seeking Alpha", "TipRanks"],
    memo: "",
  }
];

const MARKETS = [
  { value: "US", flag: "🇺🇸", label: "US" },
  { value: "KR", flag: "🇰🇷", label: "KR" },
  { value: "HK", flag: "🇭🇰", label: "HK" },
  { value: "TW", flag: "🇹🇼", label: "TW" },
  { value: "CN_SH", flag: "🇨🇳", label: "CN 상하이" },
  { value: "CN_SZ", flag: "🇨🇳", label: "CN 선전" },
];

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "KRW", label: "KRW (₩)" },
  { value: "HKD", label: "HKD (HK$)" },
  { value: "TWD", label: "TWD (NT$)" },
  { value: "CNY", label: "CNY (¥)" },
];

const TICKER_HINTS = {
  US: "AAPL, NVDA, TSLA ...",
  KR: "005930 (삼성전자), 000660 (SK하이닉스) ...",
  HK: "0700 (텐센트), 9988 (알리바바) ...",
  TW: "2330 (TSMC), 2454 (미디어텍) ...",
  CN_SH: "600519 (마오타이), 601318 (핑안보험) ...",
  CN_SZ: "000858 (우리양예), 002415 (하이캉위스) ...",
};

const getMarketInfo = (market) => MARKETS.find(m => m.value === market) || MARKETS[0];

const formatPrice = (price, currency) => {
  if (currency === "KRW") return `₩${price.toLocaleString()}`;
  if (currency === "HKD") return `HK$${price.toFixed(2)}`;
  if (currency === "TWD") return `NT$${price.toFixed(2)}`;
  if (currency === "CNY") return `¥${price.toFixed(2)}`;
  return `$${price.toFixed(2)}`;
};

const getUpside = (current, fair) => (((fair - current) / current) * 100).toFixed(1);

const verdictColors = {
  buy: { bg: "#00d27a22", border: "#00d27a", text: "#00d27a" },
  hold: { bg: "#f5a62322", border: "#f5a623", text: "#f5a623" },
  sell: { bg: "#e74c3c22", border: "#e74c3c", text: "#e74c3c" },
  watch: { bg: "#3498db22", border: "#3498db", text: "#3498db" },
};

const EMPTY_STOCK = {
  ticker: "", name: "", market: "US", exchange: "NASDAQ", sector: "",
  currentPrice: "", fairValue: "", currency: "USD",
  verdict: "Selective Buy", verdictType: "buy",
  oneLiner: "", narrative: "", keyPoints: [], dealRadar: "",
  scenarios: [
    { type: "Bull", prob: 33, price: "", color: "#00d27a" },
    { type: "Base", prob: 34, price: "", color: "#f5a623" },
    { type: "Bear", prob: 33, price: "", color: "#e74c3c" },
  ],
  weightedFV: "", events: [], assumptions: [],
  updatedAt: new Date().toISOString().slice(0, 10),
  sources: [], memo: "", memoLog: [],
  buyPrice: "", quantity: "",
  history: [],
  watchType: "보유", // 보유 | 관심
};

function ChartLinks({ ticker, market }) {
  const code = market === "KR" ? ticker.padStart(6, "0") : ticker;
  const links = market === "KR"
    ? [
        { label: "📈 네이버 금융", url: `https://finance.naver.com/item/main.naver?code=${code}` },
        { label: "📊 TradingView", url: `https://kr.tradingview.com/chart/?symbol=KRX:${code}` },
        { label: "🔍 Investing.com", url: `https://kr.investing.com/search/?q=${ticker}` },
      ]
    : [
        { label: "📈 TradingView", url: `https://kr.tradingview.com/chart/?symbol=${ticker}` },
        { label: "📊 Yahoo Finance", url: `https://finance.yahoo.com/quote/${ticker}` },
        { label: "🔍 Seeking Alpha", url: `https://seekingalpha.com/symbol/${ticker}` },
      ];
  return (
    <div className="card" style={{ padding: "20px", marginBottom: 16 }}>
      <div className="section-label">📈 차트 바로가기</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {links.map(l => (
          <a key={l.label} href={l.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <button className="btn-outline" style={{ fontSize: 13, padding: "10px 20px" }}>{l.label}</button>
          </a>
        ))}
      </div>
      <div style={{ fontSize: 10, color: "#556677", marginTop: 10 }}>
        클릭하면 새 탭에서 열려요 · 일봉/주봉/보조지표 자유롭게 확인 가능
      </div>
    </div>
  );
}

export default function App() {
  // ── 비밀번호 게이트 ──────────────────────────────────────────
  const [authed, setAuthed] = useState(() => {
    try { return localStorage.getItem("owl_auth") === "granted"; } catch { return false; }
  });
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);

  // 비밀번호 여기서 변경 가능 (sha256 없이 간단 비교)
  const PASSWORD = "haks2026";

  const handleLogin = () => {
    if (pwInput === PASSWORD) {
      try { localStorage.setItem("owl_auth", "granted"); } catch {}
      setAuthed(true); setPwError(false);
    } else {
      setPwError(true);
      setTimeout(() => setPwError(false), 1500);
    }
  };

  if (!authed) return (
    <div style={{ minHeight: "100vh", background: "#080b11", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Mono, monospace" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } input { background: #0f1420; border: 1px solid #1e2535; color: #e8eaf6; padding: 12px 16px; border-radius: 4px; font-family: 'DM Mono', monospace; font-size: 14px; outline: none; width: 100%; } input:focus { border-color: #f5a623; }`}</style>
      <div style={{ textAlign: "center", width: 320 }}>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 800, color: "#f5a623", letterSpacing: 3, marginBottom: 4 }}>
          ANALYST<span style={{ color: "#e8eaf6" }}>OS</span>
        </div>
        <div style={{ fontSize: 10, color: "#556677", letterSpacing: 2, marginBottom: 40 }}>PRIVATE RESEARCH DESK</div>
        <div style={{ background: "#0f1420", border: "1px solid #1e2535", borderRadius: 10, padding: 28 }}>
          <div style={{ fontSize: 11, color: "#556677", letterSpacing: 2, marginBottom: 16 }}>ENTER PASSWORD</div>
          <input
            type="password"
            value={pwInput}
            onChange={e => setPwInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="••••••••"
            style={{ border: `1px solid ${pwError ? "#e74c3c" : "#1e2535"}`, marginBottom: 12, textAlign: "center", letterSpacing: 4, fontSize: 18 }}
            autoFocus
          />
          {pwError && <div style={{ fontSize: 11, color: "#e74c3c", marginBottom: 10 }}>비밀번호가 틀렸어요</div>}
          <button
            onClick={handleLogin}
            style={{ width: "100%", background: "#f5a623", color: "#0a0d14", border: "none", padding: "12px", fontSize: 12, fontWeight: 600, letterSpacing: 2, borderRadius: 4, cursor: "pointer", fontFamily: "DM Mono, monospace" }}>
            ACCESS →
          </button>
        </div>
      </div>
    </div>
  );

  const [stocks, setStocks] = useState(INITIAL_STOCKS);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("dashboard");
  const [editStock, setEditStock] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterMarket, setFilterMarket] = useState("ALL");
  const [watchTab, setWatchTab] = useState("전체");
  const [sortBy, setSortBy] = useState("added"); // added | upside | pnl | stale | sector
  const [memoEdit, setMemoEdit] = useState(false);
  const [tempMemo, setTempMemo] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshStatus, setRefreshStatus] = useState({});
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicKeyInput, setAnthropicKeyInput] = useState(""); // { [id]: "ok"|"fail"|"loading" }

  useEffect(() => {
    (async () => {
      try {
        const r = localStorage.getItem("stocks_v1");
        if (r) setStocks(JSON.parse(r));
        const k = localStorage.getItem("av_api_key");
        if (k) { setApiKey(k); setApiKeyInput(k); }
        const ak = localStorage.getItem("anthropic_key");
        if (ak) { setAnthropicKey(ak); setAnthropicKeyInput(ak); }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const saveApiKey = async () => {
    setApiKey(apiKeyInput);
    try { localStorage.setItem("av_api_key", apiKeyInput); } catch {}
  };

  const saveAnthropicKey = async () => {
    setAnthropicKey(anthropicKeyInput);
    try { localStorage.setItem("anthropic_key", anthropicKeyInput); } catch {}
  };

  const refreshAllPrices = async () => {
    if (!apiKey) { alert("Alpha Vantage API 키를 먼저 설정해주세요 (⚙ 버튼)"); return; }
    setRefreshing(true);
    const statusMap = {};
    const updated = [...stocks];
    for (let i = 0; i < updated.length; i++) {
      const s = updated[i];
      statusMap[s.id] = "loading";
      setRefreshStatus({ ...statusMap });
      const price = await fetchLivePrice(s.ticker, s.market, apiKey);
      if (price) {
        updated[i] = { ...s, currentPrice: price, updatedAt: new Date().toISOString().slice(0, 10) };
        statusMap[s.id] = "ok";
      } else {
        statusMap[s.id] = "fail";
      }
      setRefreshStatus({ ...statusMap });
      // Alpha Vantage 무료 플랜: 분당 5건 제한 → 13초 간격
      if (i < updated.length - 1) await new Promise(r => setTimeout(r, 13000));
    }
    await save(updated);
    setLastRefresh(new Date().toLocaleTimeString());
    setRefreshing(false);
  };

  const refreshOnePrice = async (s) => {
    if (!apiKey) { alert("Alpha Vantage API 키를 먼저 설정해주세요 (⚙ 버튼)"); return; }
    setRefreshStatus(prev => ({ ...prev, [s.id]: "loading" }));
    const price = await fetchLivePrice(s.ticker, s.market, apiKey);
    if (price) {
      const updated = stocks.map(st => st.id === s.id ? { ...st, currentPrice: price, updatedAt: new Date().toISOString().slice(0, 10) } : st);
      await save(updated);
      if (selected?.id === s.id) setSelected(prev => ({ ...prev, currentPrice: price }));
      setRefreshStatus(prev => ({ ...prev, [s.id]: "ok" }));
    } else {
      setRefreshStatus(prev => ({ ...prev, [s.id]: "fail" }));
    }
  };

  const save = async (newStocks) => {
    setStocks(newStocks);
    try { localStorage.setItem("stocks_v1", JSON.stringify(newStocks)); } catch {}
  };

  const getCredScore = (s) => {
    let score = 0;
    // 시나리오 설정 여부 (30점)
    const scenOk = s.scenarios.filter(sc => sc.price).length;
    score += scenOk * 10;
    // 핵심 인사이트 개수 (20점)
    score += Math.min(s.keyPoints.length * 2, 20);
    // 가정 테이블 (15점)
    score += Math.min(s.assumptions.length * 5, 15);
    // 이벤트 임팩트 (10점)
    score += Math.min(s.events.length * 3, 10);
    // 내러티브 길이 (10점)
    score += s.narrative?.length > 200 ? 10 : s.narrative?.length > 50 ? 5 : 0;
    // 출처 (10점)
    score += Math.min(s.sources.length * 3, 10);
    // 딜레이더 (5점)
    score += s.dealRadar?.length > 20 ? 5 : 0;
    return Math.min(score, 100);
  };

  const getCredLabel = (score) => {
    if (score >= 80) return { label: "HIGH", color: "#00d27a" };
    if (score >= 55) return { label: "MED", color: "#f5a623" };
    return { label: "LOW", color: "#e74c3c" };
  };

  const isStale = (s) => {
    if (!s.updatedAt) return false;
    const days = Math.floor((new Date() - new Date(s.updatedAt)) / (1000 * 60 * 60 * 24));
    return days >= 30;
  };

  const filtered = stocks.filter(s => {
    const q = searchQ.toLowerCase();
    const matchSearch = !q || s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q);
    const matchMarket = filterMarket === "ALL" || s.market === filterMarket;
    const matchTab = watchTab === "전체" || (s.watchType || "보유") === watchTab;
    return matchSearch && matchMarket && matchTab;
  }).sort((a, b) => {
    if (sortBy === "upside") return parseFloat(getUpside(b.currentPrice, b.fairValue)) - parseFloat(getUpside(a.currentPrice, a.fairValue));
    if (sortBy === "pnl") {
      const pa = a.buyPrice ? ((a.currentPrice - parseFloat(a.buyPrice)) / parseFloat(a.buyPrice)) : -999;
      const pb = b.buyPrice ? ((b.currentPrice - parseFloat(b.buyPrice)) / parseFloat(b.buyPrice)) : -999;
      return pb - pa;
    }
    if (sortBy === "stale") return new Date(a.updatedAt) - new Date(b.updatedAt);
    if (sortBy === "sector") return (a.sector || "").localeCompare(b.sector || "");
    if (sortBy === "cred") return getCredScore(b) - getCredScore(a);
    return 0; // added: original order
  });

  const openDetail = (s) => { setSelected(s); setView("detail"); setMemoEdit(false); };
  const goBack = () => { setSelected(null); setView("dashboard"); setShowDeleteConfirm(false); };

  const updateMemo = async () => {
    const timestamp = new Date().toLocaleString("ko-KR");
    const newLog = { text: tempMemo, savedAt: timestamp };
    const memoLog = [...(selected.memoLog || []), newLog].slice(-30);
    const updated = stocks.map(s => s.id === selected.id ? { ...s, memo: tempMemo, memoLog } : s);
    await save(updated);
    setSelected({ ...selected, memo: tempMemo, memoLog });
    setMemoEdit(false);
  };

  const deleteStock = async () => {
    const updated = stocks.filter(s => s.id !== selected.id);
    await save(updated);
    goBack();
  };

  const updatePrice = async (id, newPrice) => {
    const updated = stocks.map(s => s.id === id ? { ...s, currentPrice: parseFloat(newPrice), updatedAt: new Date().toISOString().slice(0, 10) } : s);
    await save(updated);
    if (selected?.id === id) setSelected({ ...selected, currentPrice: parseFloat(newPrice) });
  };

  if (!loaded) return (
    <div style={{ background: "#0a0d14", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#f5a623", fontFamily: "monospace", fontSize: 18, letterSpacing: 4 }}>LOADING...</div>
    </div>
  );

  return (
    <div style={{ background: "#0a0d14", minHeight: "100vh", fontFamily: "'DM Mono', monospace", color: "#e8eaf6" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0a0d14; } ::-webkit-scrollbar-thumb { background: #f5a623; border-radius: 2px; }
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { overflow-x: hidden; }
        input, textarea, select { background: #0f1420; border: 1px solid #1e2535; color: #e8eaf6; padding: 8px 12px; border-radius: 4px; font-family: 'DM Mono', monospace; font-size: 13px; outline: none; width: 100%; }
        input:focus, textarea:focus, select:focus { border-color: #f5a623; }
        button { cursor: pointer; font-family: 'DM Mono', monospace; }
        .btn-gold { background: #f5a623; color: #0a0d14; border: none; padding: 8px 20px; font-size: 12px; font-weight: 500; letter-spacing: 1px; border-radius: 3px; text-transform: uppercase; transition: opacity 0.2s; }
        .btn-gold:hover { opacity: 0.85; }
        .btn-outline { background: transparent; color: #f5a623; border: 1px solid #f5a623; padding: 7px 18px; font-size: 12px; letter-spacing: 1px; border-radius: 3px; text-transform: uppercase; transition: all 0.2s; }
        .btn-outline:hover { background: #f5a62311; }
        .btn-ghost { background: transparent; color: #8899aa; border: 1px solid #1e2535; padding: 7px 16px; font-size: 12px; border-radius: 3px; transition: all 0.2s; }
        .btn-ghost:hover { border-color: #8899aa; color: #e8eaf6; }
        .btn-danger { background: transparent; color: #e74c3c; border: 1px solid #e74c3c44; padding: 7px 16px; font-size: 12px; border-radius: 3px; transition: all 0.2s; }
        .btn-danger:hover { background: #e74c3c22; }
        .card { background: #0f1420; border: 1px solid #1e2535; border-radius: 8px; transition: border-color 0.2s, transform 0.15s; }
        .card:hover { border-color: #f5a62344; }
        .tag { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; font-weight: 500; }
        .divider { border: none; border-top: 1px solid #1e2535; margin: 20px 0; }
        .section-label { color: #f5a623; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 12px; }
        .table-row { display: grid; padding: 10px 0; border-bottom: 1px solid #1e253533; font-size: 12px; }
        .table-row:last-child { border-bottom: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #00d27a; animation: pulse 2s infinite; display: inline-block; margin-right: 6px; }

        /* ── 모바일 바텀 네비 ── */
        .mobile-nav { display: none; }
        .desktop-nav { display: flex; }

        /* ── 모바일 미디어쿼리 ── */
        .mobile-quick-actions { display: none; }
        @media (max-width: 768px) {
          .card:hover { transform: none; }
          .mobile-quick-actions { display: flex !important; }

          /* 바텀 네비 */
          .mobile-nav {
            display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
            background: #080b11; border-top: 1px solid #1e2535;
            padding: 8px 0 max(8px, env(safe-area-inset-bottom));
            justify-content: space-around; align-items: center;
          }
          .mobile-nav-btn {
            display: flex; flex-direction: column; align-items: center; gap: 3px;
            background: transparent; border: none; color: #556677; font-size: 9px;
            padding: 4px 8px; min-width: 56px; letter-spacing: 0.5px;
          }
          .mobile-nav-btn.active { color: #f5a623; }
          .mobile-nav-icon { font-size: 18px; line-height: 1; }

          /* 상단 네비 심플하게 */
          .desktop-nav { display: none; }
          .top-nav-title { font-size: 15px !important; }
          .top-nav-subtitle { display: none; }

          /* 본문 패딩 (바텀 네비 여백) */
          .main-content { padding-bottom: 80px !important; }

          /* 필터 세로 스택 */
          .filter-row { flex-direction: column !important; gap: 8px !important; }
          .market-filters { display: flex; flex-wrap: wrap; gap: 6px; }
          .market-filters button { font-size: 10px !important; padding: 5px 10px !important; }

          /* 탭 버튼 */
          .watch-tab-row { flex-wrap: wrap; gap: 6px !important; }
          .view-btns { display: flex; gap: 6px; }
          .view-btns button { font-size: 10px !important; padding: 5px 10px !important; }

          /* 종목 카드 한 줄 */
          .stock-grid { grid-template-columns: 1fr !important; }

          /* 상세뷰 가격 2x2 */
          .price-row { grid-template-columns: 1fr 1fr !important; }

          /* 비교 테이블 스크롤 */
          .compare-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }

          /* 섹터뷰 그리드 1열 */
          .sector-grid { grid-template-columns: 1fr !important; }

          /* 상세뷰 헤더 버튼 wrap */
          .detail-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .detail-action-btns { display: flex; gap: 8px; flex-wrap: wrap; }

          /* 컨센서스 그리드 */
          .consensus-grid { grid-template-columns: 1fr !important; gap: 8px !important; }

          /* AI 분석 depth 선택 */
          .depth-selector { flex-direction: column !important; }

          /* 폼 */
          .form-grid { grid-template-columns: 1fr !important; }

          /* 섹터/비교 결과 그리드 */
          .result-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* TOP NAV */}
      <div style={{ background: "#080b11", borderBottom: "1px solid #1e2535", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {(view !== "dashboard") && (
            <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={goBack}>← BACK</button>
          )}
          <div className="top-nav-title" style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 800, color: "#f5a623", letterSpacing: 2 }}>
            ANALYST<span style={{ color: "#e8eaf6", fontWeight: 700 }}>OS</span>
          </div>
          <div className="top-nav-subtitle" style={{ fontSize: 10, color: "#8899aa", letterSpacing: 1 }}>PRIVATE RESEARCH DESK</div>
        </div>
        {/* Desktop nav buttons */}
        <div className="desktop-nav" style={{ alignItems: "center", gap: 8 }}>
          {apiKey ? (
            <><span className="live-dot" /><span style={{ fontSize: 10, color: "#00d27a" }}>LIVE</span></>
          ) : (
            <><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#556677", display: "inline-block", marginRight: 6 }} /><span style={{ fontSize: 10, color: "#556677" }}>MANUAL</span></>
          )}
          {view === "dashboard" && (
            <>
              <button className="btn-ghost" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => setView("settings")}>⚙ API 설정</button>
              <button className="btn-outline" style={{ fontSize: 11, padding: "5px 12px", opacity: refreshing ? 0.5 : 1 }} onClick={refreshAllPrices} disabled={refreshing}>
                {refreshing ? "⟳ 갱신중..." : "⟳ 주가 갱신"}
              </button>
              <button className="btn-gold" style={{ background: "#9b59b6", borderColor: "#9b59b6" }} onClick={() => setView("ai-analyze")}>🤖 AI 분석</button>
              <button className="btn-gold" onClick={() => { setEditStock({ ...EMPTY_STOCK, id: Date.now().toString() }); setView("add"); }}>+ ADD STOCK</button>
            </>
          )}
        </div>
        {/* Mobile: live indicator only */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {apiKey
            ? <><span className="live-dot" /><span style={{ fontSize: 9, color: "#00d27a" }}>LIVE</span></>
            : <span style={{ fontSize: 9, color: "#556677" }}>MANUAL</span>
          }
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="mobile-nav">
        {[
          { icon: "📊", label: "홈", action: () => setView("dashboard"), active: view === "dashboard" },
          { icon: "🤖", label: "AI분석", action: () => setView("ai-analyze"), active: view === "ai-analyze" },
          { icon: "⚖", label: "비교", action: () => setView("compare"), active: view === "compare" },
          { icon: "🏭", label: "섹터", action: () => setView("sector"), active: view === "sector" },
          { icon: "⚙", label: "설정", action: () => setView("settings"), active: view === "settings" },
        ].map(item => (
          <button key={item.label} className={`mobile-nav-btn ${item.active ? "active" : ""}`} onClick={item.action}>
            <span className="mobile-nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div className="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 12px" }}>

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div className="fade-in">
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "TOTAL POSITIONS", value: stocks.length },
                { label: "BUY", value: stocks.filter(s => s.verdictType === "buy").length, color: "#00d27a" },
                { label: "WATCH", value: stocks.filter(s => s.verdictType === "watch").length, color: "#3498db" },
                { label: "HOLD", value: stocks.filter(s => s.verdictType === "hold").length, color: "#f5a623" },
              ].map(stat => (
                <div key={stat.label} className="card" style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 9, color: "#8899aa", letterSpacing: 2, marginBottom: 6 }}>{stat.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 500, color: stat.color || "#e8eaf6", fontFamily: "Syne, sans-serif" }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Watch tabs */}
            <div className="watch-tab-row" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {["전체", "보유", "관심"].map(tab => (
                <button key={tab} onClick={() => setWatchTab(tab)}
                  style={{ background: watchTab === tab ? "#f5a623" : "transparent", color: watchTab === tab ? "#0a0d14" : "#8899aa", border: `1px solid ${watchTab === tab ? "#f5a623" : "#1e2535"}`, padding: "6px 14px", fontSize: 12, borderRadius: 3, cursor: "pointer", fontFamily: "DM Mono, monospace" }}>
                  {tab === "보유" ? "📊 보유" : tab === "관심" ? "👀 관심" : "전체"}
                  <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>
                    {tab === "전체" ? stocks.length : stocks.filter(s => (s.watchType || "보유") === tab).length}
                  </span>
                </button>
              ))}
              <div className="view-btns" style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button onClick={() => setView("compare")}
                  style={{ background: "transparent", color: "#3498db", border: "1px solid #3498db44", padding: "6px 12px", fontSize: 11, borderRadius: 3, cursor: "pointer", fontFamily: "DM Mono, monospace" }}>
                  ⚖ 비교
                </button>
                <button onClick={() => setView("sector")}
                  style={{ background: "transparent", color: "#9b59b6", border: "1px solid #9b59b644", padding: "6px 12px", fontSize: 11, borderRadius: 3, cursor: "pointer", fontFamily: "DM Mono, monospace" }}>
                  🏭 섹터
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="filter-row" style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input placeholder="검색..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: "6px 10px", fontSize: 11 }}>
                <option value="added">추가 순</option>
                <option value="upside">업사이드 순</option>
                <option value="pnl">수익률 순</option>
                <option value="stale">오래된 순</option>
                <option value="cred">신뢰도 순</option>
                <option value="sector">섹터별</option>
              </select>
              <div className="market-filters" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["ALL","US","KR","HK","TW","CN_SH","CN_SZ"].map(m => {
                  const info = m === "ALL" ? { flag: "", label: "ALL" } : getMarketInfo(m);
                  return (
                    <button key={m} onClick={() => setFilterMarket(m)} style={{ background: filterMarket === m ? "#f5a623" : "transparent", color: filterMarket === m ? "#0a0d14" : "#8899aa", border: `1px solid ${filterMarket === m ? "#f5a623" : "#1e2535"}`, padding: "5px 10px", fontSize: 11, borderRadius: 3, whiteSpace: "nowrap" }}>
                      {info.flag} {info.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stock cards */}
            <div className="stock-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
              {filtered.map(s => {
                const upside = getUpside(s.currentPrice, s.fairValue);
                const vc = verdictColors[s.verdictType] || verdictColors.watch;
                const isUp = parseFloat(upside) > 0;
                const hasPF = s.buyPrice && s.quantity;
                const pnl = hasPF ? ((s.currentPrice - parseFloat(s.buyPrice)) * parseFloat(s.quantity)) : null;
                const pnlPct = hasPF ? (((s.currentPrice - parseFloat(s.buyPrice)) / parseFloat(s.buyPrice)) * 100).toFixed(1) : null;
                const cred = getCredScore(s);
                const credLabel = getCredLabel(cred);
                return (
                  <div key={s.id} className="card fade-in" style={{ padding: 20, cursor: "pointer" }} onClick={() => openDetail(s)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 20, fontWeight: 600, fontFamily: "Syne, sans-serif", color: "#e8eaf6" }}>{s.ticker}</span>
                          <span className="tag" style={{ background: "#1e2a3a", color: "#7ab8d4" }}>{getMarketInfo(s.market).flag} {s.exchange}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#8899aa" }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: "#556677", marginTop: 2 }}>{s.sector}</div>
                      </div>
                      <span className="tag" style={{ background: vc.bg, border: `1px solid ${vc.border}`, color: vc.text }}>{s.verdict}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 9, color: "#556677", letterSpacing: 1, marginBottom: 3 }}>CURRENT</div>
                        <div style={{ fontSize: 17, fontWeight: 500 }}>{formatPrice(s.currentPrice, s.currency)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: "#556677", letterSpacing: 1, marginBottom: 3 }}>FAIR VALUE</div>
                        <div style={{ fontSize: 17, fontWeight: 500, color: "#f5a623" }}>{formatPrice(s.fairValue, s.currency)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: "#556677", letterSpacing: 1, marginBottom: 3 }}>UPSIDE</div>
                        <div style={{ fontSize: 17, fontWeight: 600, color: isUp ? "#00d27a" : "#e74c3c" }}>{isUp ? "+" : ""}{upside}%</div>
                      </div>
                    </div>
                    {/* Mini scenario bar */}
                    <div>
                      <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", gap: 1 }}>
                        {s.scenarios.map(sc => <div key={sc.type} style={{ flex: sc.prob, background: sc.color, opacity: 0.7 }} />)}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "#556677" }}>
                        {s.scenarios.map(sc => <span key={sc.type} style={{ color: sc.color }}>{sc.type} {sc.prob}%</span>)}
                      </div>
                    </div>
                    <div style={{ marginTop: 12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize: 10, color: "#556677" }}>Updated {s.updatedAt}</span>
                        {isStale(s) && <span style={{ fontSize: 9, background: "#e74c3c22", border: "1px solid #e74c3c44", color: "#e74c3c", padding: "1px 6px", borderRadius: 3 }}>⚠ 업데이트 필요</span>}
                      </div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <span title="분석 신뢰도 스코어" style={{ fontSize: 9, color: credLabel.color, background: credLabel.color + "11", border: `1px solid ${credLabel.color}33`, padding: "1px 6px", borderRadius: 3 }}>신뢰도 {cred}</span>
                        <span style={{ fontSize: 9, color: (s.watchType||"보유") === "보유" ? "#00d27a" : "#3498db", background: (s.watchType||"보유") === "보유" ? "#00d27a11" : "#3498db11", padding: "1px 6px", borderRadius: 3, border: `1px solid ${(s.watchType||"보유") === "보유" ? "#00d27a33" : "#3498db33"}` }}>{(s.watchType||"보유") === "보유" ? "📊" : "👀"}</span>
                        {hasPF && <span style={{ fontSize:11, color: pnl>=0?"#00d27a":"#e74c3c", fontWeight:500 }}>{pnl>=0?"+":""}{pnlPct}%</span>}
                        {s.history?.length > 0 && <span style={{ fontSize:9, color:"#556677", background:"#1e2535", padding:"2px 6px", borderRadius:3 }}>📅 {s.history.length}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "#556677", fontSize: 13 }}>
                  검색 결과가 없습니다. 새 종목을 추가해보세요.
                </div>
              )}
            </div>
            {lastRefresh && <div style={{ textAlign: "right", fontSize: 10, color: "#556677", marginTop: 12 }}>마지막 갱신: {lastRefresh}</div>}
          </div>
        )}

        {/* SETTINGS VIEW */}
        {view === "settings" && (
          <div className="fade-in" style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 24 }}>⚙ API 설정</div>

            <div className="card" style={{ padding: 28, marginBottom: 20 }}>
              <div className="section-label">Anthropic API 키 (AI 자동 파싱용)</div>
              <p style={{ fontSize: 12, color: "#8899aa", marginBottom: 16, lineHeight: 1.7 }}>
                Grok 분석 텍스트를 자동으로 파싱하는 기능에 사용돼요.<br/>
                분석 1회 = 약 $0.003 (0.4원) 수준으로 거의 무료예요.
              </p>
              <div style={{ background: "#0a0d14", border: "1px solid #f5a62333", borderRadius: 6, padding: "16px 20px", marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "#f5a623", marginBottom: 10, fontWeight: 500 }}>🔑 API 키 발급 방법</div>
                <div style={{ fontSize: 12, color: "#a0aab8", lineHeight: 2 }}>
                  <div>1. <span style={{ color: "#3498db" }}>https://console.anthropic.com</span> 접속</div>
                  <div>2. 회원가입 → 로그인</div>
                  <div>3. 좌측 메뉴 <strong style={{color:"#e8eaf6"}}>API Keys</strong> → <strong style={{color:"#e8eaf6"}}>Create Key</strong></div>
                  <div>4. 키 복사 후 아래에 붙여넣기</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="password"
                  value={anthropicKeyInput}
                  onChange={e => setAnthropicKeyInput(e.target.value)}
                  placeholder="sk-ant-..."
                  style={{ flex: 1 }}
                />
                <button className="btn-gold" onClick={() => { saveAnthropicKey(); }}>저장</button>
              </div>
              {anthropicKey && <div style={{ marginTop: 10, fontSize: 11, color: "#00d27a" }}>✓ Anthropic 키 저장됨 — AI 자동 파싱 활성화</div>}
            </div>

            <div className="card" style={{ padding: 28, marginBottom: 20 }}>
              <div className="section-label">Alpha Vantage API 키</div>
              <p style={{ fontSize: 12, color: "#8899aa", marginBottom: 16, lineHeight: 1.7 }}>
                Alpha Vantage는 무료로 실시간 주가를 가져올 수 있는 API입니다.<br/>
                무료 플랜: 분당 5건, 일 500건 (개인 사용에 충분)
              </p>
              <div style={{ background: "#0a0d14", border: "1px solid #f5a62333", borderRadius: 6, padding: "16px 20px", marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "#f5a623", marginBottom: 10, fontWeight: 500 }}>🔑 무료 API 키 발급 방법</div>
                <div style={{ fontSize: 12, color: "#a0aab8", lineHeight: 2 }}>
                  <div>1. <span style={{ color: "#3498db" }}>https://www.alphavantage.co/support/#api-key</span> 접속</div>
                  <div>2. 이름 + 이메일 입력 후 "GET FREE API KEY" 클릭</div>
                  <div>3. 이메일로 키 수령 (보통 즉시 발급)</div>
                  <div>4. 아래에 붙여넣기 후 저장</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  type="text"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="예) ABCDE12345FGHIJ"
                  style={{ flex: 1 }}
                />
                <button className="btn-gold" onClick={() => { saveApiKey(); setView("dashboard"); }}>저장</button>
              </div>
              {apiKey && <div style={{ marginTop: 10, fontSize: 11, color: "#00d27a" }}>✓ API 키 저장됨 — 실시간 주가 연동 활성화</div>}
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 20 }}>
              <div className="section-label">한국 주식 티커 입력 방법</div>
              <div style={{ fontSize: 12, color: "#a0aab8", lineHeight: 2 }}>
                <div>• <span style={{ color: "#f5a623" }}>KOSPI/KOSDAQ 종목</span>: 종목코드만 입력 (예: <code style={{ color: "#00d27a" }}>005930</code> = 삼성전자)</div>
                <div>• Market을 🇰🇷 KR로 선택하면 자동으로 <code>.KS</code> 접미사 적용</div>
                <div>• 미국 주식은 일반 티커 그대로 (예: <code style={{ color: "#00d27a" }}>AAPL</code>, <code style={{ color: "#00d27a" }}>NVDA</code>)</div>
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div className="section-label">주가 갱신 방법</div>
              <div style={{ fontSize: 12, color: "#a0aab8", lineHeight: 2 }}>
                <div>• 대시보드 상단 <span style={{ color: "#f5a623" }}>⟳ 주가 갱신</span> 버튼: 전체 종목 일괄 갱신</div>
                <div>• 종목 상세 → 현재가 옆 <span style={{ color: "#f5a623" }}>⟳ LIVE</span> 버튼: 개별 갱신</div>
                <div>• 무료 플랜 제한으로 종목당 13초 간격 (자동)</div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-outline" onClick={() => setView("dashboard")}>← 대시보드로</button>
            </div>
          </div>
        )}

        {/* DETAIL VIEW */}
        {view === "detail" && selected && (
          <div className="fade-in">
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                    <span style={{ fontFamily: "Syne, sans-serif", fontSize: 32, fontWeight: 800 }}>{selected.ticker}</span>
                    <span className="tag" style={{ background: "#1e2a3a", color: "#7ab8d4", fontSize: 11 }}>
                      {getMarketInfo(selected.market).flag} {getMarketInfo(selected.market).label} · {selected.exchange}
                    </span>
                    {(() => { const vc = verdictColors[selected.verdictType] || verdictColors.watch; return <span className="tag" style={{ background: vc.bg, border: `1px solid ${vc.border}`, color: vc.text, fontSize: 11 }}>{selected.verdict}</span>; })()}
                    {/* Credibility Score */}
                    {(() => {
                      const cred = getCredScore(selected);
                      const cl = getCredLabel(cred);
                      return (
                        <span title="분석 신뢰도 스코어 (시나리오·인사이트·가정·출처 등 기반 자동 채점)" style={{ fontSize: 11, color: cl.color, background: cl.color + "15", border: `1px solid ${cl.color}44`, padding: "2px 8px", borderRadius: 3, cursor: "help" }}>
                          신뢰도 {cred}/100 · {cl.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div style={{ color: "#8899aa", fontSize: 14 }}>{selected.name} · {selected.sector}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <GrokPromptButton stock={selected} />
                  <button className="btn-outline" onClick={() => { setEditStock({ ...selected }); setView("edit"); }}>EDIT</button>
                  <button className="btn-danger" onClick={() => setShowDeleteConfirm(true)}>DELETE</button>
                </div>
              </div>

              {showDeleteConfirm && (
                <div style={{ marginTop: 12, background: "#e74c3c11", border: "1px solid #e74c3c44", borderRadius: 6, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: "#e74c3c" }}>이 종목을 삭제하시겠습니까?</span>
                  <button className="btn-danger" onClick={deleteStock}>YES, DELETE</button>
                  <button className="btn-ghost" onClick={() => setShowDeleteConfirm(false)}>CANCEL</button>
                </div>
              )}
            </div>

            {/* Price row */}
            <div className="price-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "CURRENT PRICE", value: formatPrice(selected.currentPrice, selected.currency), color: "#e8eaf6", editable: true },
                { label: "FAIR VALUE (EST.)", value: formatPrice(selected.fairValue, selected.currency), color: "#f5a623" },
                { label: "UPSIDE", value: `${getUpside(selected.currentPrice, selected.fairValue) > 0 ? "+" : ""}${getUpside(selected.currentPrice, selected.fairValue)}%`, color: parseFloat(getUpside(selected.currentPrice, selected.fairValue)) > 0 ? "#00d27a" : "#e74c3c" },
                { label: "PROB-WEIGHTED FV", value: selected.weightedFV ? formatPrice(selected.weightedFV, selected.currency) : "—", color: "#3498db" },
              ].map(item => (
                <div key={item.label} className="card" style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 9, color: "#556677", letterSpacing: 2, marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: item.color, fontFamily: "Syne, sans-serif" }}>{item.value}</div>
                  {item.editable && (
                    <PriceEditor stock={selected} currentPrice={selected.currentPrice} onSave={p => updatePrice(selected.id, p)} currency={selected.currency} onRefresh={refreshOnePrice} refreshStatus={refreshStatus} />
                  )}
                </div>
              ))}
            </div>

            {/* One liner */}
            <div className="card" style={{ padding: "16px 20px", marginBottom: 16, borderLeft: "3px solid #f5a623" }}>
              <div className="section-label">ONE-LINE VERDICT</div>
              <div style={{ fontSize: 13, color: "#c8d0d8", lineHeight: 1.7 }}>{selected.oneLiner}</div>
            </div>

            {/* Narrative */}
            <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
              <div className="section-label">NARRATIVE</div>
              <div style={{ fontSize: 12, color: "#a0aab8", lineHeight: 1.8 }}>{selected.narrative}</div>
            </div>

            {/* Key Points */}
            <div className="card" style={{ padding: "20px", marginBottom: 16 }}>
              <div className="section-label">🎯 10 KEY POINTS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
                {selected.keyPoints.map(kp => (
                  <div key={kp.num} style={{ background: "#0a0d14", border: "1px solid #1e2535", borderRadius: 6, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ minWidth: 22, height: 22, background: "#f5a623", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#0a0d14", fontWeight: 700 }}>{kp.num}</div>
                      <div>
                        <div style={{ fontSize: 10, color: "#f5a623", marginBottom: 4, letterSpacing: 0.5 }}>⑤ {kp.label}</div>
                        <div style={{ fontSize: 11, color: "#a0aab8", lineHeight: 1.6 }}>{kp.content}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scenarios + Events */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              {/* Scenarios */}
              <div className="card" style={{ padding: "20px" }}>
                <div className="section-label">SCENARIO ANALYSIS</div>
                {selected.scenarios.map(sc => {
                  const upW = getUpside(selected.currentPrice, sc.price);
                  return (
                    <div key={sc.type} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: sc.color, display: "inline-block" }} />
                          <span style={{ fontSize: 12, color: sc.color }}>{sc.type}</span>
                        </div>
                        <div style={{ fontSize: 12 }}>
                          <span style={{ color: "#f5a623" }}>{formatPrice(parseFloat(sc.price) || 0, selected.currency)}</span>
                          <span style={{ color: "#556677", marginLeft: 8, fontSize: 10 }}>({upW > 0 ? "+" : ""}{upW}%)</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: "#1e2535", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${sc.prob}%`, height: "100%", background: sc.color, borderRadius: 3, opacity: 0.8 }} />
                        </div>
                        <span style={{ fontSize: 11, color: sc.color, minWidth: 32 }}>{sc.prob}%</span>
                      </div>
                    </div>
                  );
                })}
                {selected.weightedFV && (
                  <div style={{ marginTop: 12, padding: "10px 14px", background: "#0a0d14", borderRadius: 4, border: "1px solid #f5a62333" }}>
                    <div style={{ fontSize: 10, color: "#556677", marginBottom: 3 }}>확률가중 적정가</div>
                    <div style={{ fontSize: 18, color: "#f5a623", fontFamily: "Syne, sans-serif" }}>{formatPrice(selected.weightedFV, selected.currency)}</div>
                  </div>
                )}
              </div>

              {/* Events */}
              <div className="card" style={{ padding: "20px" }}>
                <div className="section-label">EVENT IMPACT</div>
                {selected.events.map((ev, i) => (
                  <div key={i} className="table-row" style={{ gridTemplateColumns: "1fr auto" }}>
                    <div style={{ fontSize: 11, color: "#a0aab8", paddingRight: 10 }}>{ev.event}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: ev.direction === "up" ? "#00d27a" : "#e74c3c", whiteSpace: "nowrap" }}>{ev.impact}</div>
                  </div>
                ))}
                {selected.events.length === 0 && <div style={{ fontSize: 11, color: "#556677" }}>이벤트 데이터 없음</div>}
              </div>
            </div>

            {/* Deal Radar */}
            {selected.dealRadar && (
              <div className="card" style={{ padding: "20px", marginBottom: 16, borderLeft: "3px solid #3498db" }}>
                <div className="section-label">🔍 DEAL RADAR</div>
                <div style={{ fontSize: 12, color: "#a0aab8", lineHeight: 1.8 }}>{selected.dealRadar}</div>
              </div>
            )}

            {/* Assumptions */}
            {selected.assumptions.length > 0 && (
              <div className="card" style={{ padding: "20px", marginBottom: 16 }}>
                <div className="section-label">▸ ASSUMPTION TABLE</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1e2535" }}>
                        {["가정 항목", "적용값", "근거", "민감도"].map(h => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#556677", fontWeight: 500, letterSpacing: 0.5 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selected.assumptions.map((a, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #1e253333" }}>
                          <td style={{ padding: "10px 12px", color: "#e8eaf6" }}>{a.item}</td>
                          <td style={{ padding: "10px 12px", color: "#f5a623" }}>{a.value}</td>
                          <td style={{ padding: "10px 12px", color: "#8899aa" }}>{a.basis}</td>
                          <td style={{ padding: "10px 12px", color: "#8899aa" }}>{a.sensitivity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sources */}
            <div className="card" style={{ padding: "16px 20px", marginBottom: 16 }}>
              <div className="section-label">📋 데이터 출처</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selected.sources.map(src => (
                  <span key={src} className="tag" style={{ background: "#1e2535", color: "#8899aa", border: "1px solid #2a3547" }}>{src}</span>
                ))}
                {selected.sources.length === 0 && <span style={{ fontSize: 11, color: "#556677" }}>출처 미입력</span>}
              </div>
            </div>

            {/* Memo */}
            <div className="card" style={{ padding: "20px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div className="section-label" style={{ margin: 0 }}>📝 나만의 메모</div>
                {!memoEdit ? (
                  <button className="btn-outline" style={{ fontSize: 10, padding: "4px 12px" }} onClick={() => { setTempMemo(selected.memo || ""); setMemoEdit(true); }}>EDIT</button>
                ) : (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn-gold" style={{ fontSize: 10, padding: "4px 12px" }} onClick={updateMemo}>SAVE</button>
                    <button className="btn-ghost" style={{ fontSize: 10, padding: "4px 12px" }} onClick={() => setMemoEdit(false)}>CANCEL</button>
                  </div>
                )}
              </div>
              {memoEdit ? (
                <textarea value={tempMemo} onChange={e => setTempMemo(e.target.value)} rows={6} placeholder="추가 분석, 개인 의견, 주의사항 등 자유롭게 작성..." style={{ width: "100%", resize: "vertical" }} />
              ) : (
                <div style={{ fontSize: 12, color: selected.memo ? "#a0aab8" : "#556677", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                  {selected.memo || "메모를 추가해보세요..."}
                </div>
              )}
              {/* Memo Log */}
              {selected.memoLog?.length > 0 && (
                <div style={{ marginTop: 16, borderTop: "1px solid #1e2535", paddingTop: 14 }}>
                  <div style={{ fontSize: 10, color: "#556677", letterSpacing: 1, marginBottom: 10 }}>📅 메모 일지</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" }}>
                    {[...selected.memoLog].reverse().map((log, i) => (
                      <div key={i} style={{ background: "#0a0d14", borderRadius: 4, padding: "8px 12px", border: "1px solid #1e2535" }}>
                        <div style={{ fontSize: 9, color: "#f5a623", marginBottom: 4 }}>{log.savedAt}</div>
                        <div style={{ fontSize: 11, color: "#8899aa", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{log.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CONSENSUS - Korean stocks only */}
            <ConsensusSection
              ticker={selected.ticker}
              market={selected.market}
              ourFairValue={parseFloat(selected.fairValue)}
              currentPrice={parseFloat(selected.currentPrice)}
              currency={selected.currency}
            />

            {/* CHART LINKS */}
            <ChartLinks ticker={selected.ticker} market={selected.market} />

            {/* PORTFOLIO TRACKING */}
            <PortfolioSection stock={selected} currency={selected.currency} onSave={async (buyPrice, quantity) => {
              const updated = stocks.map(s => s.id === selected.id ? { ...s, buyPrice, quantity } : s);
              await save(updated);
              setSelected({ ...selected, buyPrice, quantity });
            }} />

            {/* NEWS FEED */}
            <NewsFeed ticker={selected.ticker} name={selected.name} />

            {/* ANALYSIS HISTORY */}
            <HistorySection stock={selected} />
          </div>
        )}

        {/* COMPARE VIEW */}
        {view === "compare" && (
          <div className="fade-in">
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 20 }}>⚖ 종목 비교</div>
            <div className="compare-table-wrap" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f5a62344" }}>
                    {["종목", "마켓", "현재가", "적정가", "업사이드", "확률가중FV", "투자의견", "P&L", "분석일", "상태"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#f5a623", fontSize: 10, letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stocks.map(s => {
                    const upside = getUpside(s.currentPrice, s.fairValue);
                    const vc = verdictColors[s.verdictType] || verdictColors.watch;
                    const hasPF = s.buyPrice && s.quantity && s.currentPrice;
                    const pnlPct = hasPF ? (((s.currentPrice - parseFloat(s.buyPrice)) / parseFloat(s.buyPrice)) * 100).toFixed(1) : null;
                    return (
                      <tr key={s.id} style={{ borderBottom: "1px solid #1e253533", cursor: "pointer" }}
                        onClick={() => { setSelected(s); setView("detail"); }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 500, color: "#e8eaf6" }}>{s.ticker}</div>
                          <div style={{ fontSize: 10, color: "#556677" }}>{s.name}</div>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#8899aa" }}>{getMarketInfo(s.market).flag}</td>
                        <td style={{ padding: "12px 14px", fontWeight: 500 }}>{formatPrice(s.currentPrice, s.currency)}</td>
                        <td style={{ padding: "12px 14px", color: "#f5a623" }}>{formatPrice(s.fairValue, s.currency)}</td>
                        <td style={{ padding: "12px 14px", color: parseFloat(upside) > 0 ? "#00d27a" : "#e74c3c", fontWeight: 500 }}>{upside > 0 ? "+" : ""}{upside}%</td>
                        <td style={{ padding: "12px 14px", color: "#3498db" }}>{s.weightedFV ? formatPrice(s.weightedFV, s.currency) : "—"}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span className="tag" style={{ background: vc.bg, border: `1px solid ${vc.border}`, color: vc.text, fontSize: 9 }}>{s.verdict}</span>
                        </td>
                        <td style={{ padding: "12px 14px", color: pnlPct ? (parseFloat(pnlPct) >= 0 ? "#00d27a" : "#e74c3c") : "#556677" }}>
                          {pnlPct ? `${parseFloat(pnlPct) >= 0 ? "+" : ""}${pnlPct}%` : "—"}
                        </td>
                        <td style={{ padding: "12px 14px", color: "#556677", whiteSpace: "nowrap" }}>
                          {s.updatedAt}
                          {isStale(s) && <span style={{ marginLeft: 4, fontSize: 9, color: "#e74c3c" }}>⚠</span>}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ fontSize: 9, color: (s.watchType||"보유") === "보유" ? "#00d27a" : "#3498db" }}>{(s.watchType||"보유") === "보유" ? "📊 보유" : "👀 관심"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* AI ANALYZE VIEW */}
        {view === "ai-analyze" && (
          <AIAnalyzeView
            anthropicKey={anthropicKey}
            onSave={async (stock) => {
              const updated = [...stocks, stock];
              await save(updated);
              setSelected(stock);
              setView("detail");
            }}
          />
        )}

        {/* SECTOR VIEW */}
        {view === "sector" && (
          <div className="fade-in">
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 20 }}>🏭 섹터별 뷰</div>
            {(() => {
              const sectors = {};
              stocks.forEach(s => {
                const sec = s.sector || "미분류";
                if (!sectors[sec]) sectors[sec] = [];
                sectors[sec].push(s);
              });
              return Object.entries(sectors).sort((a, b) => b[1].length - a[1].length).map(([sector, secs]) => {
                const avgUpside = (secs.reduce((acc, s) => acc + parseFloat(getUpside(s.currentPrice, s.fairValue)), 0) / secs.length).toFixed(1);
                const buyCount = secs.filter(s => s.verdictType === "buy").length;
                return (
                  <div key={sector} className="card" style={{ padding: 20, marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color: "#e8eaf6" }}>{sector}</div>
                        <div style={{ fontSize: 11, color: "#556677", marginTop: 2 }}>
                          {secs.length}개 종목 · 평균 업사이드 <span style={{ color: parseFloat(avgUpside) > 0 ? "#00d27a" : "#e74c3c" }}>{parseFloat(avgUpside) > 0 ? "+" : ""}{avgUpside}%</span> · BUY {buyCount}개
                        </div>
                      </div>
                      <div style={{ display: "flex", height: 6, width: 120, borderRadius: 3, overflow: "hidden", gap: 2 }}>
                        {secs.map(s => { const vc = verdictColors[s.verdictType] || verdictColors.watch; return <div key={s.id} style={{ flex: 1, background: vc.border }} />; })}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                      {secs.map(s => {
                        const upside = getUpside(s.currentPrice, s.fairValue);
                        const vc = verdictColors[s.verdictType] || verdictColors.watch;
                        return (
                          <div key={s.id} onClick={() => { setSelected(s); setView("detail"); }}
                            style={{ background: "#0a0d14", border: "1px solid #1e2535", borderRadius: 6, padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: "#e8eaf6" }}>{s.ticker}</div>
                              <div style={{ fontSize: 10, color: "#556677" }}>{s.name}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 12, color: parseFloat(upside) > 0 ? "#00d27a" : "#e74c3c", fontWeight: 500 }}>{parseFloat(upside) > 0 ? "+" : ""}{upside}%</div>
                              <div style={{ fontSize: 9, color: vc.text }}>{s.verdict}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {(view === "add" || view === "edit") && editStock && (
          <StockForm
            stock={editStock}
            isEdit={view === "edit"}
            anthropicKey={anthropicKey}
            onSave={async (newStock) => {
              let updated;
              if (view === "add") {
                updated = [...stocks, newStock];
              } else {
                // Save current state as history snapshot before updating
                const prev = stocks.find(s => s.id === newStock.id);
                const snapshot = prev ? { ...prev, savedAt: new Date().toISOString() } : null;
                const history = [...(prev?.history || [])];
                if (snapshot) history.unshift(snapshot);
                updated = stocks.map(s => s.id === newStock.id ? { ...newStock, history: history.slice(0, 20) } : s);
              }
              await save(updated);
              if (view === "edit") { setSelected(updated.find(s => s.id === newStock.id)); setView("detail"); }
              else { goBack(); }
            }}
            onCancel={() => { if (view === "edit") setView("detail"); else goBack(); }}
          />
        )}
      </div>
    </div>
  );
}

function PriceEditor({ stock, currentPrice, onSave, currency, onRefresh, refreshStatus }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(currentPrice);
  const st = refreshStatus?.[stock?.id];
  return (
    <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
      {editing ? (
        <div style={{ display: "flex", gap: 4 }}>
          <input type="number" value={val} onChange={e => setVal(e.target.value)} style={{ padding: "3px 6px", fontSize: 11, width: 80 }} />
          <button className="btn-gold" style={{ padding: "3px 8px", fontSize: 10 }} onClick={() => { onSave(val); setEditing(false); }}>✓</button>
        </div>
      ) : (
        <button onClick={() => { setVal(currentPrice); setEditing(true); }} style={{ background: "none", border: "none", color: "#556677", fontSize: 10, padding: 0, cursor: "pointer" }}>✎ 수동입력</button>
      )}
      <button onClick={() => onRefresh(stock)} disabled={st === "loading"}
        style={{ background: "none", border: "none", fontSize: 10, padding: 0, cursor: "pointer",
          color: st === "ok" ? "#00d27a" : st === "fail" ? "#e74c3c" : st === "loading" ? "#f5a623" : "#3498db" }}>
        {st === "loading" ? "⟳ 갱신중..." : st === "ok" ? "✓ 갱신완료" : st === "fail" ? "✗ 실패(티커확인)" : "⟳ LIVE 갱신"}
      </button>
    </div>
  );
}

async function parseAnalysisWithAI(text, anthropicKey) {
  const res = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, anthropicKey }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

function StockForm({ stock, isEdit, onSave, onCancel, anthropicKey }) {
  const [form, setForm] = useState(stock);
  const [kpText, setKpText] = useState(stock.keyPoints.map(k => `${k.label}: ${k.content}`).join("\n"));
  const [sourcesText, setSourcesText] = useState(stock.sources.join(", "));
  const [eventsText, setEventsText] = useState(stock.events.map(e => `${e.event}|${e.impact}|${e.direction}`).join("\n"));
  const [assText, setAssText] = useState(stock.assumptions.map(a => `${a.item}|${a.value}|${a.basis}|${a.sensitivity}`).join("\n"));
  const [pasteText, setPasteText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [parseSuccess, setParseSuccess] = useState(false);

  const handleAutoParse = async () => {
    if (!pasteText.trim()) return;
    setParsing(true);
    setParseError("");
    setParseSuccess(false);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText, anthropicKey }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const method = data._method || "ai";
      const warn = data._warn || "";
      delete data._method; delete data._warn;
      setForm(f => ({ ...f, ...data, id: f.id }));
      setKpText((data.keyPoints || []).map(k => `${k.label}: ${k.content}`).join("\n"));
      setSourcesText((data.sources || []).join(", "));
      setEventsText((data.events || []).map(e => `${e.event}|${e.impact}|${e.direction}`).join("\n"));
      setAssText((data.assumptions || []).map(a => `${a.item}|${a.value}|${a.basis}|${a.sensitivity}`).join("\n"));
      setParseSuccess(true);
      setPasteText("");
      if (method === "regex") setParseError("⚡ 기본 파싱 완료 (API 키 없음) — 일부 항목 직접 확인해주세요");
    } catch (e) {
      setParseError(`실패: ${e.message || "잠시 후 다시 시도해주세요."}`);
    }
    setParsing(false);
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setScenario = (i, key, val) => setForm(f => {
    const sc = [...f.scenarios];
    sc[i] = { ...sc[i], [key]: key === "prob" || key === "price" ? parseFloat(val) || 0 : val };
    return { ...f, scenarios: sc };
  });

  const handleSave = () => {
    const keyPoints = kpText.split("\n").filter(Boolean).map((line, i) => {
      const [label, ...rest] = line.split(":");
      return { num: i + 1, label: label.trim(), content: rest.join(":").trim() };
    });
    const sources = sourcesText.split(",").map(s => s.trim()).filter(Boolean);
    const events = eventsText.split("\n").filter(Boolean).map(line => {
      const [event, impact, direction] = line.split("|");
      return { event: event?.trim() || "", impact: impact?.trim() || "", direction: direction?.trim() || "up" };
    });
    const assumptions = assText.split("\n").filter(Boolean).map(line => {
      const [item, value, basis, sensitivity] = line.split("|");
      return { item: item?.trim() || "", value: value?.trim() || "", basis: basis?.trim() || "", sensitivity: sensitivity?.trim() || "" };
    });

    const sc = form.scenarios;
    const wFV = sc.reduce((sum, s) => sum + (s.prob / 100) * (parseFloat(s.price) || 0), 0);

    onSave({ ...form, keyPoints, sources, events, assumptions, currentPrice: parseFloat(form.currentPrice) || 0, fairValue: parseFloat(form.fairValue) || 0, weightedFV: parseFloat(wFV.toFixed(2)) });
  };

  const F = ({ label, children, hint }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 10, color: "#8899aa", letterSpacing: 1, display: "block", marginBottom: 5 }}>{label.toUpperCase()}</label>
      {children}
      {hint && <div style={{ fontSize: 9, color: "#556677", marginTop: 3 }}>{hint}</div>}
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 800 }}>{isEdit ? "EDIT STOCK" : "ADD NEW STOCK"}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-gold" onClick={handleSave}>SAVE</button>
          <button className="btn-ghost" onClick={onCancel}>CANCEL</button>
        </div>
      </div>

      {/* AI AUTO PARSE BOX */}
      <div className="card" style={{ padding: 24, marginBottom: 20, borderLeft: "3px solid #f5a623", background: "#0f1420" }}>
        <div className="section-label" style={{ fontSize: 11 }}>🤖 AI 자동 파싱 — Grok 분석 텍스트 붙여넣기</div>
        <p style={{ fontSize: 12, color: "#8899aa", marginBottom: 12, lineHeight: 1.7 }}>
          Grok에서 분석한 텍스트를 아래에 붙여넣으면 AI가 자동으로 모든 항목을 채워줘요!
        </p>
        <textarea
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
          rows={6}
          placeholder={"여기에 Grok 분석 텍스트 전체를 붙여넣기 하세요...\n\nT1 ENERGY\nU.S. Domestic Solar & Battery Supply Chain\n[NASDAQ: TE]\n$6.46 ..."}
          style={{ width: "100%", marginBottom: 10, resize: "vertical", borderColor: pasteText ? "#f5a623" : "#1e2535" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="btn-gold"
            onClick={handleAutoParse}
            disabled={parsing || !pasteText.trim()}
            style={{ opacity: parsing || !pasteText.trim() ? 0.5 : 1, fontSize: 13, padding: "10px 24px" }}
          >
            {parsing ? "⟳ AI 분석중..." : "✨ 자동으로 채우기"}
          </button>
          {parseSuccess && <span style={{ color: "#00d27a", fontSize: 12 }}>✓ 완료! 아래 내용을 확인 후 SAVE 하세요</span>}
          {parseError && <span style={{ color: "#e74c3c", fontSize: 12 }}>✗ {parseError}</span>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left col */}
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 14 }}>
            <div className="section-label">기본 정보</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <F label="Ticker"><input value={form.ticker} onChange={e => set("ticker", e.target.value.toUpperCase())} placeholder={TICKER_HINTS[form.market] || "티커 입력"} /></F>
              <F label="Market">
                <select value={form.market} onChange={e => set("market", e.target.value)}>
                  {MARKETS.map(m => <option key={m.value} value={m.value}>{m.flag} {m.label}</option>)}
                </select>
              </F>
            </div>
            <F label="회사명"><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="T1 ENERGY" /></F>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <F label="보유/관심">
                <select value={form.watchType || "보유"} onChange={e => set("watchType", e.target.value)}>
                  <option value="보유">📊 보유 종목</option>
                  <option value="관심">👀 관심 종목</option>
                </select>
              </F>
              <F label="Sector"><input value={form.sector} onChange={e => set("sector", e.target.value)} placeholder="Solar & Battery" /></F>
            </div>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 14 }}>
            <div className="section-label">가격 & 밸류에이션</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <F label="현재가"><input type="number" value={form.currentPrice} onChange={e => set("currentPrice", e.target.value)} placeholder="6.46" /></F>
              <F label="적정가"><input type="number" value={form.fairValue} onChange={e => set("fairValue", e.target.value)} placeholder="10.50" /></F>
              <F label="통화">
                <select value={form.currency} onChange={e => set("currency", e.target.value)}>
                  {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </F>
            </div>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 14 }}>
            <div className="section-label">투자 판단</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <F label="Verdict">
                <input value={form.verdict} onChange={e => set("verdict", e.target.value)} placeholder="Selective Buy" />
              </F>
              <F label="Verdict Type">
                <select value={form.verdictType} onChange={e => set("verdictType", e.target.value)}>
                  <option value="buy">BUY</option>
                  <option value="hold">HOLD</option>
                  <option value="sell">SELL</option>
                  <option value="watch">WATCH</option>
                </select>
              </F>
            </div>
            <F label="One-line Verdict"><textarea value={form.oneLiner} onChange={e => set("oneLiner", e.target.value)} rows={3} placeholder="한 줄 투자 의견..." /></F>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 14 }}>
            <div className="section-label">시나리오</div>
            {form.scenarios.map((sc, i) => (
              <div key={sc.type} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr", gap: 8, marginBottom: 10, alignItems: "center" }}>
                <span style={{ color: sc.color, fontSize: 12 }}>{sc.type}</span>
                <F label="확률(%)"><input type="number" value={sc.prob} onChange={e => setScenario(i, "prob", e.target.value)} /></F>
                <F label="목표가"><input type="number" value={sc.price} onChange={e => setScenario(i, "price", e.target.value)} /></F>
              </div>
            ))}
          </div>
        </div>

        {/* Right col */}
        <div>
          <div className="card" style={{ padding: 20, marginBottom: 14 }}>
            <div className="section-label">Narrative</div>
            <textarea value={form.narrative} onChange={e => set("narrative", e.target.value)} rows={5} placeholder="종목 내러티브 및 핵심 thesis..." />
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 14 }}>
            <div className="section-label">10 Key Points</div>
            <textarea value={kpText} onChange={e => setKpText(e.target.value)} rows={10} placeholder={"레이블: 내용\n예시) 종합 판단: Undervalued growth name...\n가장 중요한 변수: G2 Austin timeline...\n최대 리스크: Debt load..."} />
            <div style={{ fontSize: 9, color: "#556677", marginTop: 4 }}>형식: 레이블: 내용 (줄바꿈으로 구분)</div>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 14 }}>
            <div className="section-label">Deal Radar</div>
            <textarea value={form.dealRadar} onChange={e => set("dealRadar", e.target.value)} rows={4} placeholder="주요 딜/이벤트 관찰 내용..." />
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 14 }}>
            <div className="section-label">이벤트 임팩트</div>
            <textarea value={eventsText} onChange={e => setEventsText(e.target.value)} rows={5} placeholder={"이벤트명|임팩트|방향\n예) G2 상업화 발표|+35%|up\n추가 지분 희석|-25%|down"} />
            <div style={{ fontSize: 9, color: "#556677", marginTop: 4 }}>형식: 이벤트|+X%|up 또는 down</div>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 14 }}>
            <div className="section-label">가정 테이블</div>
            <textarea value={assText} onChange={e => setAssText(e.target.value)} rows={4} placeholder={"항목|값|근거|민감도\n예) WACC|11.5%|Beta ~1.6 기반|±1% → ±12%"} />
            <div style={{ fontSize: 9, color: "#556677", marginTop: 4 }}>형식: 항목|적용값|근거|민감도</div>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 14 }}>
            <div className="section-label">데이터 출처 & 날짜</div>
            <F label="출처 (쉼표로 구분)"><input value={sourcesText} onChange={e => setSourcesText(e.target.value)} placeholder="Yahoo Finance, Seeking Alpha, TipRanks" /></F>
            <F label="분석일"><input type="date" value={form.updatedAt} onChange={e => set("updatedAt", e.target.value)} /></F>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PORTFOLIO SECTION ──────────────────────────────────────────────
function PortfolioSection({ stock, currency, onSave }) {
  const [editing, setEditing] = useState(false);
  const [bp, setBp] = useState(stock.buyPrice || "");
  const [qty, setQty] = useState(stock.quantity || "");

  const hasPF = stock.buyPrice && stock.quantity && stock.currentPrice;
  const buyPrice = parseFloat(stock.buyPrice) || 0;
  const quantity = parseFloat(stock.quantity) || 0;
  const currentPrice = parseFloat(stock.currentPrice) || 0;
  const costBasis = buyPrice * quantity;
  const currentValue = currentPrice * quantity;
  const pnlAmt = currentValue - costBasis;
  const pnlPct = buyPrice > 0 ? ((currentPrice - buyPrice) / buyPrice * 100).toFixed(2) : 0;
  const isProfit = pnlAmt >= 0;

  return (
    <div className="card" style={{ padding: "20px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div className="section-label" style={{ margin: 0 }}>📊 포트폴리오 트래킹</div>
        {!editing
          ? <button className="btn-outline" style={{ fontSize: 10, padding: "4px 12px" }} onClick={() => { setBp(stock.buyPrice||""); setQty(stock.quantity||""); setEditing(true); }}>EDIT</button>
          : <div style={{ display:"flex", gap:6 }}>
              <button className="btn-gold" style={{ fontSize:10, padding:"4px 12px" }} onClick={() => { onSave(bp, qty); setEditing(false); }}>SAVE</button>
              <button className="btn-ghost" style={{ fontSize:10, padding:"4px 12px" }} onClick={() => setEditing(false)}>CANCEL</button>
            </div>
        }
      </div>
      {editing ? (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><label style={{ fontSize:10, color:"#8899aa", display:"block", marginBottom:4 }}>매수 평균단가</label>
            <input type="number" value={bp} onChange={e=>setBp(e.target.value)} placeholder="0.00" /></div>
          <div><label style={{ fontSize:10, color:"#8899aa", display:"block", marginBottom:4 }}>보유 수량</label>
            <input type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="0" /></div>
        </div>
      ) : hasPF ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px,1fr))", gap:12 }}>
          {[
            { label:"매수단가", value: formatPrice(buyPrice, currency), color:"#8899aa" },
            { label:"현재가", value: formatPrice(currentPrice, currency), color:"#e8eaf6" },
            { label:"보유수량", value: quantity.toLocaleString(), color:"#8899aa" },
            { label:"투자원금", value: formatPrice(costBasis, currency), color:"#8899aa" },
            { label:"평가금액", value: formatPrice(currentValue, currency), color:"#e8eaf6" },
            { label:"수익/손실", value: `${isProfit?"+":""}${formatPrice(pnlAmt, currency)} (${isProfit?"+":""}${pnlPct}%)`, color: isProfit?"#00d27a":"#e74c3c" },
          ].map(item => (
            <div key={item.label} style={{ background:"#0a0d14", borderRadius:6, padding:"10px 14px", border:"1px solid #1e2535" }}>
              <div style={{ fontSize:9, color:"#556677", marginBottom:4 }}>{item.label}</div>
              <div style={{ fontSize:14, fontWeight:500, color:item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize:12, color:"#556677", textAlign:"center", padding:"16px 0" }}>
          EDIT을 눌러 매수단가와 수량을 입력하면 수익률이 자동 계산돼요
        </div>
      )}
    </div>
  );
}

// ── NEWS FEED ──────────────────────────────────────────────────────
function NewsFeed({ ticker, name }) {
  const [news, setNews] = useState([]);
  const [fallbackLinks, setFallbackLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);

  const CACHE_KEY = `news_${ticker}`;
  const CACHE_TTL = 60 * 60 * 1000; // 1시간

  const fetchNews = async (force = false) => {
    // 캐시 확인
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setNews(data.news || []);
            setFallbackLinks(data.fallbackLinks || []);
            setLastFetched(new Date(timestamp).toLocaleTimeString("ko-KR"));
            return;
          }
        }
      } catch {}
    }

    setLoading(true);
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, name }),
      });
      const data = await res.json();
      setNews(data.news || []);
      setFallbackLinks(data.fallbackLinks || []);
      // 캐시 저장
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      } catch {}
      setLastFetched(new Date().toLocaleTimeString("ko-KR"));
    } catch {}
    setLoading(false);
  };

  // 페이지 열리면 자동 로드
  useEffect(() => { fetchNews(); }, [ticker]);

  return (
    <div className="card" style={{ padding: "20px", marginBottom: 16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <div className="section-label" style={{ margin: 0 }}>📰 최신 뉴스</div>
          {lastFetched && <div style={{ fontSize: 9, color: "#556677", marginTop: 2 }}>마지막 갱신: {lastFetched} · 1시간 캐싱</div>}
        </div>
        <button className="btn-outline" style={{ fontSize:10, padding:"4px 12px" }} onClick={() => fetchNews(true)} disabled={loading}>
          {loading ? "⟳ 로딩중..." : "⟳ 새로고침"}
        </button>
      </div>
      {loading && <div style={{ fontSize:12, color:"#f5a623", textAlign:"center", padding:"16px 0" }}>⟳ 뉴스 수집중...</div>}
      {!loading && news.length === 0 && fallbackLinks.length > 0 && (
        <div>
          <div style={{ fontSize:12, color:"#556677", marginBottom:12 }}>직접 확인해보세요:</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {fallbackLinks.map(l => (
              <a key={l.label} href={l.url} target="_blank" rel="noreferrer" style={{ textDecoration:"none" }}>
                <button className="btn-ghost" style={{ fontSize:11 }}>{l.label} →</button>
              </a>
            ))}
          </div>
        </div>
      )}
      {news.map((item, i) => (
        <a key={i} href={item.link} target="_blank" rel="noreferrer" style={{ display:"block", textDecoration:"none" }}>
          <div style={{ padding:"10px 0", borderBottom:"1px solid #1e253533" }}>
            <div style={{ fontSize:12, color:"#c8d0d8", lineHeight:1.5, marginBottom:4 }}>{item.title}</div>
            <div style={{ fontSize:10, color:"#556677" }}>{item.source} · {item.date}</div>
          </div>
        </a>
      ))}
    </div>
  );
}

// ── HISTORY SECTION ────────────────────────────────────────────────
function HistorySection({ stock }) {
  const [expanded, setExpanded] = useState(null);
  const history = stock.history || [];

  if (history.length === 0) return (
    <div className="card" style={{ padding:"20px", marginBottom:24 }}>
      <div className="section-label">📅 분석 히스토리</div>
      <div style={{ fontSize:12, color:"#556677", textAlign:"center", padding:"16px 0" }}>
        분석을 수정하면 이전 버전이 자동으로 여기에 저장돼요
      </div>
    </div>
  );

  return (
    <div className="card" style={{ padding:"20px", marginBottom:24 }}>
      <div className="section-label">📅 분석 히스토리 ({history.length}개)</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {history.map((snap, i) => {
          const date = snap.savedAt ? new Date(snap.savedAt).toLocaleString("ko-KR") : snap.updatedAt;
          const isOpen = expanded === i;
          const upside = getUpside(snap.currentPrice, snap.fairValue);
          const vc = verdictColors[snap.verdictType] || verdictColors.watch;
          return (
            <div key={i} style={{ border:"1px solid #1e2535", borderRadius:6, overflow:"hidden" }}>
              <div onClick={() => setExpanded(isOpen ? null : i)}
                style={{ padding:"12px 16px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", background: isOpen?"#1e2535":"transparent" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:10, color:"#f5a623" }}>v{history.length - i}</span>
                  <span style={{ fontSize:12, color:"#e8eaf6" }}>{date}</span>
                  <span className="tag" style={{ background: vc.bg, border:`1px solid ${vc.border}`, color: vc.text, fontSize:9 }}>{snap.verdict}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:12, color:"#f5a623" }}>{formatPrice(snap.currentPrice, snap.currency)}</span>
                  <span style={{ fontSize:11, color: parseFloat(upside)>0?"#00d27a":"#e74c3c" }}>{upside>0?"+":""}{upside}%</span>
                  <span style={{ color:"#556677", fontSize:12 }}>{isOpen?"▲":"▼"}</span>
                </div>
              </div>
              {isOpen && (
                <div style={{ padding:"16px", borderTop:"1px solid #1e2535", background:"#080b11" }}>
                  <div style={{ fontSize:12, color:"#a0aab8", lineHeight:1.7, marginBottom:10 }}><strong style={{color:"#f5a623"}}>Verdict:</strong> {snap.oneLiner}</div>
                  {snap.keyPoints?.slice(0,3).map(kp => (
                    <div key={kp.num} style={{ fontSize:11, color:"#8899aa", marginBottom:4 }}>
                      <span style={{ color:"#f5a623" }}>#{kp.num} {kp.label}:</span> {kp.content}
                    </div>
                  ))}
                  {snap.keyPoints?.length > 3 && <div style={{ fontSize:10, color:"#556677" }}>... 외 {snap.keyPoints.length-3}개</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CONSENSUS SECTION (Korean stocks only) ────────────────────────
function ConsensusSection({ ticker, market, ourFairValue, currentPrice, currency }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (market === "KR") fetchConsensus();
  }, [ticker]);

  const fetchConsensus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/consensus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const d = await res.json();
      setData(d);
    } catch {}
    setLoading(false);
    setLoaded(true);
  };

  if (market !== "KR") return null;

  const ourUpside = ourFairValue && currentPrice
    ? (((ourFairValue - currentPrice) / currentPrice) * 100).toFixed(1)
    : null;
  const consUpside = data?.upsideVsConsensus;
  const diff = ourUpside && consUpside
    ? (parseFloat(ourUpside) - parseFloat(consUpside)).toFixed(1)
    : null;

  return (
    <div className="card" style={{ padding: "20px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div className="section-label" style={{ margin: 0 }}>📊 컨센서스 비교</div>
          {data?.fetchedAt && <div style={{ fontSize: 9, color: "#556677", marginTop: 2 }}>네이버 금융 기준 · {data.fetchedAt}</div>}
        </div>
        <button className="btn-outline" style={{ fontSize: 10, padding: "4px 12px" }} onClick={fetchConsensus} disabled={loading}>
          {loading ? "⟳" : "⟳ 새로고침"}
        </button>
      </div>

      {loading && <div style={{ fontSize: 12, color: "#f5a623", textAlign: "center", padding: "16px 0" }}>⟳ 컨센서스 데이터 수집 중...</div>}

      {loaded && data && !data.error && (
        <>
          {/* 목표가 비교 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "#0a0d14", borderRadius: 6, padding: "12px 14px", border: "1px solid #9b59b644" }}>
              <div style={{ fontSize: 9, color: "#9b59b6", letterSpacing: 1, marginBottom: 4 }}>우리 적정가</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: "#f5a623" }}>{ourFairValue ? ourFairValue.toLocaleString() : "—"}</div>
              <div style={{ fontSize: 10, color: ourUpside ? (parseFloat(ourUpside) > 0 ? "#00d27a" : "#e74c3c") : "#556677" }}>
                {ourUpside ? `${parseFloat(ourUpside) > 0 ? "+" : ""}${ourUpside}%` : "—"}
              </div>
            </div>
            <div style={{ background: "#0a0d14", borderRadius: 6, padding: "12px 14px", border: "1px solid #3498db44" }}>
              <div style={{ fontSize: 9, color: "#3498db", letterSpacing: 1, marginBottom: 4 }}>컨센서스</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: "#e8eaf6" }}>{data.consensusTargetPrice ? data.consensusTargetPrice.toLocaleString() : "—"}</div>
              <div style={{ fontSize: 10, color: consUpside ? (parseFloat(consUpside) > 0 ? "#00d27a" : "#e74c3c") : "#556677" }}>
                {consUpside ? `${parseFloat(consUpside) > 0 ? "+" : ""}${consUpside}%` : "—"}
              </div>
            </div>
            <div style={{ background: "#0a0d14", borderRadius: 6, padding: "12px 14px", border: "1px solid #1e2535" }}>
              <div style={{ fontSize: 9, color: "#556677", letterSpacing: 1, marginBottom: 4 }}>괴리율</div>
              <div style={{ fontSize: 18, fontWeight: 500, color: diff ? (parseFloat(diff) > 0 ? "#00d27a" : "#e74c3c") : "#556677" }}>
                {diff ? `${parseFloat(diff) > 0 ? "+" : ""}${diff}%p` : "—"}
              </div>
              <div style={{ fontSize: 10, color: "#556677" }}>
                {diff ? (parseFloat(diff) > 0 ? "우리가 더 낙관적" : "우리가 더 보수적") : ""}
              </div>
            </div>
          </div>

          {/* 투자의견 분포 */}
          {data.opinions.total > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#556677", marginBottom: 8 }}>
                투자의견 분포 · {data.analystCount}개 증권사 커버
              </div>
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 2, marginBottom: 6 }}>
                {data.opinions.buyPct > 0 && <div style={{ flex: parseInt(data.opinions.buyPct), background: "#00d27a" }} />}
                {data.opinions.holdPct > 0 && <div style={{ flex: parseInt(data.opinions.holdPct), background: "#f5a623" }} />}
                {data.opinions.sellPct > 0 && <div style={{ flex: parseInt(data.opinions.sellPct), background: "#e74c3c" }} />}
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 10 }}>
                <span style={{ color: "#00d27a" }}>▲ 매수 {data.opinions.buy}개 ({data.opinions.buyPct}%)</span>
                <span style={{ color: "#f5a623" }}>— 중립 {data.opinions.hold}개 ({data.opinions.holdPct}%)</span>
                <span style={{ color: "#e74c3c" }}>▼ 매도 {data.opinions.sell}개 ({data.opinions.sellPct}%)</span>
              </div>
            </div>
          )}

          {/* 최근 리포트 */}
          {data.recentReports?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: "#556677", letterSpacing: 1, marginBottom: 8 }}>최근 증권사 리포트</div>
              {data.recentReports.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #1e253533" }}>
                  <div>
                    <span style={{ fontSize: 11, color: "#e8eaf6", fontWeight: 500 }}>{r.broker}</span>
                    {r.title && <span style={{ fontSize: 10, color: "#556677", marginLeft: 8 }}>{r.title.slice(0, 30)}{r.title.length > 30 ? "..." : ""}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {r.opinion && (
                      <span style={{ fontSize: 10, color: r.opinion.includes("매수") || r.opinion === "Buy" ? "#00d27a" : r.opinion.includes("매도") || r.opinion === "Sell" ? "#e74c3c" : "#f5a623" }}>
                        {r.opinion}
                      </span>
                    )}
                    {r.targetPrice && <span style={{ fontSize: 11, color: "#f5a623" }}>{r.targetPrice.toLocaleString()}원</span>}
                    <span style={{ fontSize: 9, color: "#556677" }}>{r.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.recentReports?.length === 0 && (
            <div style={{ fontSize: 11, color: "#556677", textAlign: "center", padding: "8px 0" }}>
              최근 리포트 없음 · <a href={`https://finance.naver.com/research/company_list.naver?code=${ticker.padStart(6,"0")}`} target="_blank" rel="noreferrer" style={{ color: "#f5a623" }}>네이버 금융에서 확인 →</a>
            </div>
          )}
        </>
      )}

      {loaded && data?.error && (
        <div style={{ fontSize: 11, color: "#556677" }}>
          데이터를 불러오지 못했어요. <a href={`https://finance.naver.com/item/main.naver?code=${ticker.padStart(6,"0")}`} target="_blank" rel="noreferrer" style={{ color: "#f5a623" }}>네이버 금융에서 직접 확인 →</a>
        </div>
      )}
    </div>
  );
}

// ── GROK PROMPT BUTTON ─────────────────────────────────────────────
function GrokPromptButton({ stock }) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);

  const prompt = `아래 양식에 맞춰서 ${stock.ticker} (${stock.name}) 주식 분석을 해줘. 기존 분석이 있으면 업데이트해줘.

[분석 요청 종목]
티커: ${stock.ticker}
회사명: ${stock.name}
마켓: ${stock.market}
섹터: ${stock.sector || "확인 필요"}
현재가: ${stock.currentPrice ? stock.currentPrice + " " + stock.currency : "확인 필요"}
기존 적정가: ${stock.fairValue ? stock.fairValue + " " + stock.currency : "미입력"}

[요청 항목]
1. 현재가 확인 및 업데이트 (Yahoo Finance / MarketScreener 등 실제 기준)
2. DCF + Comps 기반 적정가 산출
3. Bull/Base/Bear 시나리오 (확률 합계 100%)
4. 핵심 인사이트 10가지
5. 이벤트별 주가 영향 (+/-%)
6. 가정 테이블 (항목/적용값/근거/민감도)
7. 딜 레이더 (M&A, 파트너십, 규제 이슈 등)
8. 한줄 투자 판단

[출력 양식]
아래 형식을 반드시 지켜줘:

EQUITY ANALYSIS DASHBOARD
${stock.name}
[티커 마켓:티커심볼]
[CURRENT PRICE] (실제 가격 Yahoo Finance 기준)
[FAIR VALUE (EST.)] (DCF+Comps 기반 추정)
▲/▼ X% Upside/Downside
ONE-LINE VERDICT: (한줄 판단)
NARRATIVE: (3-5문장)
🎯 핵심 인사이트 10 Key Points
① ~ ⑩ (각 항목별 한줄 인사이트)
🔍 딜 레이더
So What — 투자 판단 요약
■ 확률 가중 적정가
Bull X% × 가격 = 금액
Base X% × 가격 = 금액
Bear X% × 가격 = 금액
→ 확률가중 적정가: (합계)
■ 이벤트별 주가 영향
■ 가정 테이블 (항목|적용값|근거|민감도)

출처는 모두 [실제] 또는 [추정] 표기 필수.`;

  const copy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <button className="btn-ghost" style={{ fontSize: 11, padding: "5px 12px", color: "#9b59b6", border: "1px solid #9b59b644" }}
        onClick={() => setShow(true)}>
        🤖 Grok 프롬프트
      </button>
      {show && (
        <div style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setShow(false)}>
          <div style={{ background: "#0f1420", border: "1px solid #1e2535", borderRadius: 10, padding: 24, maxWidth: 640, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: 15, fontWeight: 700 }}>🤖 Grok 분석 프롬프트</div>
              <button className="btn-ghost" style={{ fontSize: 11 }} onClick={() => setShow(false)}>✕ 닫기</button>
            </div>
            <div style={{ fontSize: 10, color: "#556677", marginBottom: 12 }}>
              아래 프롬프트를 복사해서 Grok에 붙여넣으면 분석 양식에 맞는 결과를 받을 수 있어요.
            </div>
            <textarea readOnly value={prompt} rows={12}
              style={{ fontSize: 11, color: "#a0aab8", background: "#0a0d14", border: "1px solid #1e2535", borderRadius: 6, padding: 12, resize: "none", flex: 1, lineHeight: 1.7 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn-gold" style={{ flex: 1 }} onClick={copy}>
                {copied ? "✓ 복사됨!" : "📋 프롬프트 복사"}
              </button>
              <a href="https://grok.com" target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <button className="btn-outline" style={{ whiteSpace: "nowrap" }}>Grok 열기 →</button>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── AI ANALYZE VIEW ────────────────────────────────────────────────
function AIAnalyzeView({ anthropicKey, onSave }) {
  const [companyName, setCompanyName] = useState("");
  const [depth, setDepth] = useState("deep");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState("input");

  const analyze = async () => {
    if (!companyName.trim()) return;
    if (!anthropicKey) { setError("⚙ API 설정에서 Anthropic API 키를 먼저 입력해주세요!"); return; }
    setLoading(true); setError(""); setStep("loading");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim(), anthropicKey, depth }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setStep("input"); }
      else { setResult(data); setStep("preview"); }
    } catch (e) { setError(e.message); setStep("input"); }
    setLoading(false);
  };

  const steps_msg = [
    "월스트리트 IB 분석가 모드 진입 중...",
    "최신 주가 및 실적 웹 검색 중...",
    "DCF 모델 구성 중...",
    "비교기업(Comps) 실시간 멀티플 검색 중...",
    "딜 레이더 스캔 중 (M&A/IPO/규제)...",
    "Bull/Base/Bear 시나리오 계산 중...",
    "역산 검증 및 신뢰도 체크 중...",
    "확률 가중 적정가 산출 중...",
    "분석 결과 정리 중...",
  ];
  const [stepIdx, setStepIdx] = useState(0);
  useEffect(() => {
    if (!loading) { setStepIdx(0); return; }
    const t = setInterval(() => setStepIdx(i => (i + 1) % steps_msg.length), 2500);
    return () => clearInterval(t);
  }, [loading]);

  if (step === "loading") return (
    <div className="fade-in" style={{ maxWidth: 600, margin: "80px auto", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 24 }}>🤖</div>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 700, color: "#f5a623", marginBottom: 8 }}>
        {companyName} {depth === "deep" ? "심층" : "빠른"} 분석 중...
      </div>
      <div style={{ fontSize: 13, color: "#8899aa", marginBottom: 8 }}>{steps_msg[stepIdx]}</div>
      <div style={{ fontSize: 10, color: "#556677", marginBottom: 28 }}>웹 검색으로 실시간 데이터 수집 중</div>
      <div style={{ width: "100%", height: 3, background: "#1e2535", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", background: "#f5a623", borderRadius: 2, animation: `progress ${depth === "deep" ? 60 : 30}s linear forwards` }} />
      </div>
      <style>{`@keyframes progress { from { width: 0% } to { width: 90% } }`}</style>
      <div style={{ marginTop: 16, fontSize: 11, color: "#556677" }}>
        {depth === "deep" ? "심층 분석: 60~90초 소요 · 웹 검색 5회 이상" : "빠른 분석: 20~40초 소요"}
      </div>
    </div>
  );

  if (step === "preview" && result) {
    const upside = result.currentPrice && result.fairValue
      ? (((result.fairValue - result.currentPrice) / result.currentPrice) * 100).toFixed(1) : "—";
    const vc = verdictColors[result.verdictType] || verdictColors.watch;
    return (
      <div className="fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800 }}>🤖 AI 분석 결과</div>
            <div style={{ fontSize: 11, color: "#556677", marginTop: 4 }}>검토 후 대시보드에 추가하세요 · {depth === "deep" ? "심층 분석" : "빠른 분석"}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" onClick={() => { setStep("input"); setResult(null); }}>← 다시 분석</button>
            <button className="btn-gold" style={{ fontSize: 13, padding: "8px 24px" }} onClick={() => onSave(result)}>✓ 대시보드에 추가</button>
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 16, borderLeft: "3px solid #9b59b6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 800 }}>{result.ticker}</span>
            <span className="tag" style={{ background: "#1e2a3a", color: "#7ab8d4" }}>{getMarketInfo(result.market).flag} {result.exchange}</span>
            <span className="tag" style={{ background: vc.bg, border: `1px solid ${vc.border}`, color: vc.text }}>{result.verdict}</span>
          </div>
          <div style={{ fontSize: 13, color: "#8899aa", marginBottom: 16 }}>{result.name} · {result.sector}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginBottom: 16 }}>
            {[
              { label: "현재가", value: formatPrice(result.currentPrice, result.currency), color: "#e8eaf6" },
              { label: "적정가(EST.)", value: formatPrice(result.fairValue, result.currency), color: "#f5a623" },
              { label: "업사이드", value: `${parseFloat(upside) > 0 ? "+" : ""}${upside}%`, color: parseFloat(upside) > 0 ? "#00d27a" : "#e74c3c" },
              { label: "확률가중FV", value: result.weightedFV ? formatPrice(result.weightedFV, result.currency) : "—", color: "#3498db" },
            ].map(item => (
              <div key={item.label} style={{ background: "#0a0d14", borderRadius: 6, padding: "10px 14px", border: "1px solid #1e2535" }}>
                <div style={{ fontSize: 9, color: "#556677", marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#c8d0d8", lineHeight: 1.7, borderLeft: "2px solid #f5a623", paddingLeft: 12, marginBottom: result.reversalCheck ? 12 : 0 }}>
            {result.oneLiner}
          </div>
          {result.reversalCheck && (
            <div style={{ fontSize: 11, color: "#8899aa", background: "#0a0d14", borderRadius: 6, padding: "8px 12px", marginTop: 8, border: "1px solid #1e2535" }}>
              🔍 {result.reversalCheck}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          {/* Scenarios */}
          <div className="card" style={{ padding: 20 }}>
            <div className="section-label">시나리오 분석</div>
            {result.scenarios?.map(sc => (
              <div key={sc.type} style={{ padding: "8px 0", borderBottom: "1px solid #1e253533" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: sc.color, fontWeight: 500 }}>{sc.type} {sc.prob}%</span>
                  <span style={{ fontSize: 13, color: sc.color, fontWeight: 500 }}>{formatPrice(sc.price, result.currency)}</span>
                </div>
                <div style={{ fontSize: 10, color: "#556677", lineHeight: 1.5 }}>{sc.description}</div>
              </div>
            ))}
          </div>
          {/* Peers */}
          <div className="card" style={{ padding: 20 }}>
            <div className="section-label">비교기업 Comps</div>
            {result.peers?.length > 0 ? result.peers.slice(0, 6).map(p => (
              <div key={p.ticker} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #1e253533" }}>
                <span style={{ fontSize: 11, color: "#e8eaf6" }}>{p.ticker} <span style={{ color: "#556677", fontSize: 10 }}>{p.name}</span></span>
                <span style={{ fontSize: 11, color: "#f5a623" }}>{p.metric} {p.value}</span>
              </div>
            )) : <div style={{ fontSize: 11, color: "#556677" }}>비교기업 데이터 없음</div>}
          </div>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div className="section-label">🎯 핵심 인사이트</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 8 }}>
            {result.keyPoints?.map(kp => (
              <div key={kp.num} style={{ background: "#0a0d14", borderRadius: 6, padding: "10px 12px", border: "1px solid #1e2535" }}>
                <div style={{ fontSize: 10, color: "#f5a623", marginBottom: 3 }}>#{kp.num} {kp.label}</div>
                <div style={{ fontSize: 11, color: "#8899aa", lineHeight: 1.6 }}>{kp.content}</div>
              </div>
            ))}
          </div>
        </div>

        {result.credibilityCheck && (
          <div className="card" style={{ padding: 16, marginBottom: 16, borderLeft: "3px solid #3498db" }}>
            <div className="section-label">📋 신뢰도 체크</div>
            <div style={{ fontSize: 11, color: "#8899aa", lineHeight: 1.7 }}>{result.credibilityCheck}</div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 8, marginBottom: 24 }}>
          <button className="btn-gold" style={{ fontSize: 14, padding: "12px 40px" }} onClick={() => onSave(result)}>✓ 대시보드에 추가하기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: 620, margin: "0 auto" }}>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>🤖 AI 자동 분석</div>
      <div style={{ fontSize: 12, color: "#8899aa", marginBottom: 28, lineHeight: 1.7 }}>
        기업명만 입력하면 월스트리트 IB 수준의 분석을 자동 생성해드려요.<br/>
        웹 검색으로 실시간 데이터 수집 · DCF · Comps · 딜 레이더 · 역산검증 포함.
      </div>

      {/* Depth selector */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { value: "quick", icon: "⚡", label: "빠른 분석", desc: "20~40초 · 핵심만" },
          { value: "deep", icon: "🔬", label: "심층 분석", desc: "60~90초 · 웹검색 5회+" },
        ].map(d => (
          <div key={d.value} onClick={() => setDepth(d.value)}
            style={{ flex: 1, padding: "14px 16px", border: `2px solid ${depth === d.value ? "#9b59b6" : "#1e2535"}`, borderRadius: 8, cursor: "pointer", background: depth === d.value ? "#9b59b611" : "transparent", transition: "all 0.2s" }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>{d.icon} <span style={{ fontSize: 13, fontWeight: 600, color: depth === d.value ? "#9b59b6" : "#e8eaf6" }}>{d.label}</span></div>
            <div style={{ fontSize: 11, color: "#556677" }}>{d.desc}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 28 }}>
        <div style={{ fontSize: 11, color: "#8899aa", marginBottom: 10 }}>기업명 또는 티커 입력</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={companyName} onChange={e => setCompanyName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && analyze()}
            placeholder="예) SK하이닉스 / NVIDIA / 삼성전자 / TSMC ..."
            style={{ flex: 1, fontSize: 15, padding: "12px 16px" }} autoFocus />
          <button className="btn-gold" style={{ background: "#9b59b6", borderColor: "#9b59b6", padding: "12px 24px", fontSize: 13 }}
            onClick={analyze} disabled={loading || !companyName.trim()}>
            🤖 분석 시작
          </button>
        </div>
        {error && <div style={{ marginTop: 12, fontSize: 12, color: "#e74c3c" }}>{error}</div>}

        <div style={{ marginTop: 24, borderTop: "1px solid #1e2535", paddingTop: 20 }}>
          <div style={{ fontSize: 10, color: "#556677", letterSpacing: 1, marginBottom: 12 }}>분석에 포함되는 항목</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[
              "🌐 실시간 웹 검색 기반 데이터",
              "📊 DCF (FCFF 기반 적정가)",
              "🏢 비교기업 Comps (7~15개)",
              "📈 Bull/Base/Bear 시나리오",
              "🔍 딜 레이더 (M&A/IPO/규제)",
              "⚡ 이벤트별 주가 영향",
              "🔄 역산 검증 (시총 괴리 명시)",
              "✅ 신뢰도 체크리스트",
            ].map(item => (
              <div key={item} style={{ fontSize: 11, color: "#8899aa", padding: "4px 0" }}>{item}</div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 20, fontSize: 10, color: "#556677", lineHeight: 1.7 }}>
          ⚠ AI 분석은 참고용이며 투자 권유가 아닙니다. 중요한 수치는 반드시 직접 검증하세요.
        </div>
      </div>
    </div>
  );
}
