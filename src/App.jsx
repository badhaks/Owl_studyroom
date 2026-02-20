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
  sources: [], memo: "",
  buyPrice: "", quantity: "",
  history: [],
};

function getTVSymbol(ticker, market) {
  if (market === "KR") return `KRX:${ticker}`;
  if (market === "HK") return `HKEX:${parseInt(ticker, 10)}`;
  if (market === "TW") return `TWSE:${ticker}`;
  if (market === "CN_SH") return `SSE:${ticker}`;
  if (market === "CN_SZ") return `SZSE:${ticker}`;
  return ticker;
}

function TradingViewWidget({ ticker, market }) {
  const symbol = getTVSymbol(ticker, market);
  const params = new URLSearchParams({
    symbol,
    interval: "D",
    timezone: "Asia/Seoul",
    theme: "dark",
    style: "1",
    locale: "kr",
    toolbar_bg: "#0f1420",
    enable_publishing: "false",
    hide_top_toolbar: "false",
    hide_legend: "false",
    save_image: "false",
    studies: JSON.stringify(["RSI@tv-basicstudies", "MACD@tv-basicstudies"]),
    height: "480",
  });
  const src = `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  return (
    <div style={{ width: "100%", height: 480, borderRadius: 6, overflow: "hidden", background: "#0f1420" }}>
      <iframe
        key={symbol}
        src={src}
        style={{ width: "100%", height: "100%", border: "none" }}
        allowFullScreen
        title={`${ticker} Chart`}
      />
    </div>
  );
}

export default function App() {
  const [stocks, setStocks] = useState(INITIAL_STOCKS);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("dashboard"); // dashboard | detail | add | edit | settings
  const [editStock, setEditStock] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterMarket, setFilterMarket] = useState("ALL");
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

  const filtered = stocks.filter(s => {
    const q = searchQ.toLowerCase();
    const matchSearch = !q || s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q);
    const matchMarket = filterMarket === "ALL" || s.market === filterMarket;
    return matchSearch && matchMarket;
  });

  const openDetail = (s) => { setSelected(s); setView("detail"); setMemoEdit(false); };
  const goBack = () => { setSelected(null); setView("dashboard"); setShowDeleteConfirm(false); };

  const updateMemo = async () => {
    const updated = stocks.map(s => s.id === selected.id ? { ...s, memo: tempMemo } : s);
    await save(updated);
    setSelected({ ...selected, memo: tempMemo });
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
        * { box-sizing: border-box; margin: 0; padding: 0; }
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
        .card:hover { border-color: #f5a62344; transform: translateY(-1px); }
        .tag { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; font-weight: 500; }
        .divider { border: none; border-top: 1px solid #1e2535; margin: 20px 0; }
        .section-label { color: #f5a623; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 12px; }
        .table-row { display: grid; padding: 10px 0; border-bottom: 1px solid #1e253533; font-size: 12px; }
        .table-row:last-child { border-bottom: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #00d27a; animation: pulse 2s infinite; display: inline-block; margin-right: 6px; }
      `}</style>

      {/* TOP NAV */}
      <div style={{ background: "#080b11", borderBottom: "1px solid #1e2535", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {view !== "dashboard" && (
            <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={goBack}>← BACK</button>
          )}
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 800, color: "#f5a623", letterSpacing: 2 }}>
            ANALYST<span style={{ color: "#e8eaf6", fontWeight: 700 }}>OS</span>
          </div>
          <div style={{ fontSize: 10, color: "#8899aa", letterSpacing: 1 }}>PRIVATE RESEARCH DESK</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {apiKey ? (
            <><span className="live-dot" /><span style={{ fontSize: 10, color: "#00d27a" }}>LIVE</span></>
          ) : (
            <><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#556677", display: "inline-block", marginRight: 6 }} /><span style={{ fontSize: 10, color: "#556677" }}>MANUAL</span></>
          )}
          {view === "dashboard" && (
            <>
              <button className="btn-ghost" style={{ fontSize: 11, padding: "5px 12px" }}
                onClick={() => setView("settings")} title="API 설정">⚙ API 설정</button>
              <button className="btn-outline" style={{ fontSize: 11, padding: "5px 12px", opacity: refreshing ? 0.5 : 1 }}
                onClick={refreshAllPrices} disabled={refreshing} title="전체 주가 갱신">
                {refreshing ? "⟳ 갱신중..." : "⟳ 주가 갱신"}
              </button>
              <button className="btn-gold" onClick={() => { setEditStock({ ...EMPTY_STOCK, id: Date.now().toString() }); setView("add"); }}>
                + ADD STOCK
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>

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

            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input placeholder="종목명 / 티커 / 섹터 검색..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
              {["ALL","US","KR","HK","TW","CN_SH","CN_SZ"].map(m => {
                const info = m === "ALL" ? { flag: "", label: "ALL" } : getMarketInfo(m);
                return (
                  <button key={m} onClick={() => setFilterMarket(m)} style={{ background: filterMarket === m ? "#f5a623" : "transparent", color: filterMarket === m ? "#0a0d14" : "#8899aa", border: `1px solid ${filterMarket === m ? "#f5a623" : "#1e2535"}`, padding: "6px 14px", fontSize: 11, borderRadius: 3, letterSpacing: 1, whiteSpace: "nowrap" }}>
                    {info.flag} {info.label}
                  </button>
                );
              })}
            </div>

            {/* Stock cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
              {filtered.map(s => {
                const upside = getUpside(s.currentPrice, s.fairValue);
                const vc = verdictColors[s.verdictType] || verdictColors.watch;
                const isUp = parseFloat(upside) > 0;
                const hasPF = s.buyPrice && s.quantity;
                const pnl = hasPF ? ((s.currentPrice - parseFloat(s.buyPrice)) * parseFloat(s.quantity)) : null;
                const pnlPct = hasPF ? (((s.currentPrice - parseFloat(s.buyPrice)) / parseFloat(s.buyPrice)) * 100).toFixed(1) : null;
                return (
                  <div key={s.id} className="card fade-in" style={{ padding: 20, cursor: "pointer" }} onClick={() => openDetail(s)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 18, fontWeight: 500, fontFamily: "Syne, sans-serif", color: "#e8eaf6" }}>{s.ticker}</span>
                          <span className="tag" style={{ background: "#1e2a3a", color: "#7ab8d4" }}>{getMarketInfo(s.market).flag} {s.exchange}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#8899aa" }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: "#556677", marginTop: 2 }}>{s.sector}</div>
                      </div>
                      <span className="tag" style={{ background: vc.bg, border: `1px solid ${vc.border}`, color: vc.text }}>{s.verdict}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 9, color: "#556677", letterSpacing: 1, marginBottom: 3 }}>CURRENT</div>
                        <div style={{ fontSize: 16, fontWeight: 500 }}>{formatPrice(s.currentPrice, s.currency)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: "#556677", letterSpacing: 1, marginBottom: 3 }}>FAIR VALUE</div>
                        <div style={{ fontSize: 16, fontWeight: 500, color: "#f5a623" }}>{formatPrice(s.fairValue, s.currency)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: "#556677", letterSpacing: 1, marginBottom: 3 }}>UPSIDE</div>
                        <div style={{ fontSize: 16, fontWeight: 500, color: isUp ? "#00d27a" : "#e74c3c" }}>{isUp ? "+" : ""}{upside}%</div>
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
                      <div style={{ fontSize: 10, color: "#556677" }}>Updated {s.updatedAt}</div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        {hasPF && <span style={{ fontSize:11, color: pnl>=0?"#00d27a":"#e74c3c", fontWeight:500 }}>{pnl>=0?"+":""}{pnlPct}% P&L</span>}
                        {s.history?.length > 0 && <span style={{ fontSize:9, color:"#556677", background:"#1e2535", padding:"2px 6px", borderRadius:3 }}>📅 {s.history.length}개 히스토리</span>}
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
                  </div>
                  <div style={{ color: "#8899aa", fontSize: 14 }}>{selected.name} · {selected.sector}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
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
            <div className="card" style={{ padding: "20px", marginBottom: 24 }}>
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
            </div>

            {/* TRADINGVIEW CHART */}
            <div className="card" style={{ padding: "20px", marginBottom: 16 }}>
              <div className="section-label">📈 기술적 분석 차트 (이평선 · RSI · MACD)</div>
              <div style={{ fontSize: 10, color: "#556677", marginBottom: 12 }}>TradingView 제공 · 실시간 캔들차트</div>
              <TradingViewWidget ticker={selected.ticker} market={selected.market} />
            </div>

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

        {/* ADD / EDIT FORM */}
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
    if (!anthropicKey) { setParseError("⚙ API 설정에서 Anthropic API 키를 먼저 입력해주세요!"); return; }
    setParsing(true);
    setParseError("");
    setParseSuccess(false);
    try {
      const parsed = await parseAnalysisWithAI(pasteText, anthropicKey);
      setForm(f => ({ ...f, ...parsed, id: f.id }));
      setKpText((parsed.keyPoints || []).map(k => `${k.label}: ${k.content}`).join("\n"));
      setSourcesText((parsed.sources || []).join(", "));
      setEventsText((parsed.events || []).map(e => `${e.event}|${e.impact}|${e.direction}`).join("\n"));
      setAssText((parsed.assumptions || []).map(a => `${a.item}|${a.value}|${a.basis}|${a.sensitivity}`).join("\n"));
      setParseSuccess(true);
      setPasteText("");
    } catch (e) {
      setParseError(`실패: ${e.message || "API 키를 확인하거나 잠시 후 다시 시도해주세요."}`);
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
              <F label="Exchange"><input value={form.exchange} onChange={e => set("exchange", e.target.value)} placeholder="NASDAQ / KOSPI" /></F>
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
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const fetchNews = async () => {
    setLoading(true); setError("");
    try {
      const q = encodeURIComponent(`${ticker} ${name} stock`);
      const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`;
      const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=8`;
      const res = await fetch(proxyUrl);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setNews(data.items.map(item => ({
          title: item.title,
          link: item.link,
          date: new Date(item.pubDate).toLocaleDateString("ko-KR"),
          source: item.author || "Yahoo Finance",
        })));
      } else {
        // fallback: Google News RSS
        const gUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(ticker+" stock")}&hl=en-US&gl=US&ceid=US:en`;
        const gProxy = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(gUrl)}&count=8`;
        const gRes = await fetch(gProxy);
        const gData = await gRes.json();
        if (gData.items) {
          setNews(gData.items.map(item => ({
            title: item.title,
            link: item.link,
            date: new Date(item.pubDate).toLocaleDateString("ko-KR"),
            source: item.author || "Google News",
          })));
        } else { setError("뉴스를 불러오지 못했어요."); }
      }
    } catch { setError("뉴스 로드 실패. 잠시 후 다시 시도해주세요."); }
    setLoading(false); setLoaded(true);
  };

  return (
    <div className="card" style={{ padding: "20px", marginBottom: 16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div className="section-label" style={{ margin:0 }}>📰 최신 뉴스</div>
        <button className="btn-outline" style={{ fontSize:10, padding:"4px 12px" }} onClick={fetchNews} disabled={loading}>
          {loading ? "⟳ 로딩중..." : loaded ? "⟳ 새로고침" : "뉴스 불러오기"}
        </button>
      </div>
      {!loaded && !loading && <div style={{ fontSize:12, color:"#556677", textAlign:"center", padding:"16px 0" }}>버튼을 눌러 {ticker} 관련 최신 뉴스를 확인하세요</div>}
      {loading && <div style={{ fontSize:12, color:"#f5a623", textAlign:"center", padding:"16px 0" }}>⟳ 뉴스 수집중...</div>}
      {error && <div style={{ fontSize:12, color:"#e74c3c" }}>{error}</div>}
      {news.map((item, i) => (
        <a key={i} href={item.link} target="_blank" rel="noreferrer" style={{ display:"block", textDecoration:"none" }}>
          <div style={{ padding:"10px 0", borderBottom:"1px solid #1e253533", cursor:"pointer" }} className="news-item">
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
