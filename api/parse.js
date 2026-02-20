export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { text, anthropicKey } = req.body;

  // ── API 키 없으면 → 정규식 기반 기본 파싱 ──────────────────
  if (!anthropicKey) {
    try {
      const parsed = regexParse(text);
      return res.status(200).json({ ...parsed, _method: "regex" });
    } catch (e) {
      return res.status(200).json({ ...emptyStock(), _method: "regex", _warn: "파싱 실패. 직접 입력해주세요." });
    }
  }

  // ── API 키 있으면 → AI 파싱 ──────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `아래 주식 분석 텍스트에서 JSON 추출. JSON만 출력, 다른 텍스트 없이.

텍스트:
${text.slice(0, 3000)}

JSON:
{"ticker":"","name":"","market":"US/KR/HK/TW/CN_SH/CN_SZ","exchange":"","sector":"","currentPrice":0,"fairValue":0,"currency":"USD/KRW/HKD/TWD/CNY","verdict":"","verdictType":"buy/hold/sell/watch","oneLiner":"","narrative":"","keyPoints":[{"num":1,"label":"","content":""}],"dealRadar":"","scenarios":[{"type":"Bull","prob":0,"price":0,"color":"#00d27a"},{"type":"Base","prob":0,"price":0,"color":"#f5a623"},{"type":"Bear","prob":0,"price":0,"color":"#e74c3c"}],"weightedFV":0,"events":[{"event":"","impact":"","direction":"up/down"}],"assumptions":[{"item":"","value":"","basis":"","sensitivity":""}],"sources":[],"updatedAt":"${today}"}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 3000, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await response.json();
    if (data.error) {
      // API 오류 시 regex fallback
      const parsed = regexParse(text);
      return res.status(200).json({ ...parsed, _method: "regex", _warn: "API 오류로 기본 파싱 사용: " + data.error.message });
    }
    const raw = data.content?.[0]?.text || "";
    const f = raw.indexOf("{"), l = raw.lastIndexOf("}");
    if (f === -1) throw new Error("JSON not found");
    const parsed = JSON.parse(raw.slice(f, l + 1));
    return res.status(200).json({ ...parsed, _method: "ai" });
  } catch (e) {
    const parsed = regexParse(text);
    return res.status(200).json({ ...parsed, _method: "regex", _warn: "AI 파싱 실패, 기본 파싱 사용" });
  }
}

function emptyStock() {
  return { ticker:"", name:"", market:"US", exchange:"", sector:"", currentPrice:0, fairValue:0, currency:"USD", verdict:"", verdictType:"watch", oneLiner:"", narrative:"", keyPoints:[], dealRadar:"", scenarios:[{type:"Bull",prob:33,price:0,color:"#00d27a"},{type:"Base",prob:34,price:0,color:"#f5a623"},{type:"Bear",prob:33,price:0,color:"#e74c3c"}], weightedFV:0, events:[], assumptions:[], sources:[], updatedAt: new Date().toISOString().slice(0,10) };
}

function regexParse(text) {
  const num = (s) => { const m = s?.match(/[\d,.]+/); return m ? parseFloat(m[0].replace(/,/g,"")) : 0; };
  const find = (patterns, t) => { for (const p of patterns) { const m = t.match(p); if (m) return m[1]?.trim(); } return ""; };

  // 티커 추출
  const ticker = find([/\[([A-Z0-9]{1,6})\s+(?:NASDAQ|NYSE|KRX|KOSPI|KOSDAQ)/, /티커[:\s]+([A-Z0-9]{2,6})/, /\b([A-Z]{2,5})\b/], text);
  // 회사명
  const name = find([/회사명[:\s]+([^\n]+)/, /^#\s*([^\n]+)/m, /([가-힣A-Za-z][가-힣A-Za-z\s]+(?:주|Inc|Corp|Co))/], text);
  // 마켓 감지
  const market = /KRX|KOSPI|KOSDAQ|\.KS/.test(text) ? "KR" : /HKEX|\.HK/.test(text) ? "HK" : /TWSE|\.TW/.test(text) ? "TW" : "US";
  const currency = market === "KR" ? "KRW" : market === "HK" ? "HKD" : market === "TW" ? "TWD" : "USD";
  // 현재가
  const curMatch = text.match(/(?:현재가|Current\s*Price)[^\d]*([0-9,]+)/i);
  const currentPrice = curMatch ? num(curMatch[1]) : 0;
  // 적정가
  const fvMatch = text.match(/(?:적정가|Fair\s*Value)[^\d]*([0-9,]+)/i);
  const fairValue = fvMatch ? num(fvMatch[1]) : 0;
  // 확률가중
  const wfvMatch = text.match(/(?:확률.*적정가|Weighted)[^\d]*([0-9,]+)/i);
  const weightedFV = wfvMatch ? num(wfvMatch[1]) : 0;
  // 투자의견
  const verdictMap = { "매수": "buy", "buy": "buy", "selective buy": "buy", "hold": "hold", "중립": "hold", "매도": "sell", "sell": "sell" };
  const verdictRaw = find([/(?:투자의견|Verdict)[:\s]+([^\n]+)/, /(Selective Buy|Strong Buy|매수|중립|매도|Hold|Sell)/i], text) || "";
  const verdictType = verdictMap[verdictRaw.toLowerCase()] || "watch";
  // 한줄 판단
  const oneLiner = find([/ONE-LINE[^:]*:[^\n]*\n([^\n]+)/, /한\s*줄\s*판단[:\s]+([^\n]+)/], text);
  // 내러티브
  const narrative = find([/NARRATIVE[:\s]*\n([^#\n].+(?:\n[^#\n].+)*)/i, /내러티브[:\s]*\n([^\n]+)/i], text);
  // 섹터
  const sector = find([/섹터[:\s]+([^\n]+)/, /Sector[:\s]+([^\n]+)/i], text);
  // 시나리오
  const bullPrice = num(text.match(/Bull[^0-9]*([0-9,]+)/i)?.[1]);
  const basePrice = num(text.match(/Base[^0-9]*([0-9,]+)/i)?.[1]);
  const bearPrice = num(text.match(/Bear[^0-9]*([0-9,]+)/i)?.[1]);
  const bullProb = num(text.match(/Bull[^0-9]*(\d+)%/i)?.[1]) || 33;
  const baseProb = num(text.match(/Base[^0-9]*(\d+)%/i)?.[1]) || 34;
  const bearProb = num(text.match(/Bear[^0-9]*(\d+)%/i)?.[1]) || 33;
  // 핵심 포인트 (①~⑩ 패턴)
  const kpMatches = [...text.matchAll(/[①②③④⑤⑥⑦⑧⑨⑩]\s*\[?([^\]—\n]+)\]?\s*[—-]\s*([^\n]+)/g)];
  const keyPoints = kpMatches.slice(0, 10).map((m, i) => ({ num: i+1, label: m[1].trim(), content: m[2].trim() }));
  // 딜레이더
  const dealRadar = find([/딜\s*레이더[^\n]*\n([\s\S]{20,300}?)(?=\n[■▸#])/, /Deal\s*Radar[^\n]*\n([\s\S]{20,300}?)(?=\n[■▸#])/i], text);
  // 출처
  const srcMatch = text.match(/출처[:\s]+([^\n]+)/);
  const sources = srcMatch ? srcMatch[1].split(/[,、]/).map(s=>s.trim()).filter(Boolean) : [];

  return {
    ticker, name, market, exchange: market === "KR" ? "KOSPI" : "NASDAQ", sector, currency,
    currentPrice, fairValue, weightedFV,
    verdict: verdictRaw || "Selective Buy", verdictType,
    oneLiner, narrative: narrative || "",
    keyPoints, dealRadar: dealRadar || "",
    scenarios: [
      { type:"Bull", prob: bullProb, price: bullPrice, color:"#00d27a" },
      { type:"Base", prob: baseProb, price: basePrice, color:"#f5a623" },
      { type:"Bear", prob: bearProb, price: bearPrice, color:"#e74c3c" },
    ],
    events: [], assumptions: [], sources,
    updatedAt: new Date().toISOString().slice(0, 10),
    watchType: "보유", buyPrice: "", quantity: "", history: [], memo: "", memoLog: [],
  };
}
