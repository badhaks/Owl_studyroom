export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { text, anthropicKey } = req.body;
  if (!anthropicKey) return res.status(400).json({ error: "No API key" });

  const prompt = `아래는 주식 분석 텍스트야. 이걸 읽고 JSON 형식으로만 응답해. 다른 설명 없이 JSON만 출력해.

분석 텍스트:
${text}

아래 JSON 구조로 추출해. 없는 정보는 빈 문자열이나 빈 배열로:
{
  "ticker": "티커심볼",
  "name": "회사명",
  "market": "US 또는 KR 또는 HK 또는 TW 또는 CN_SH 또는 CN_SZ",
  "exchange": "NASDAQ/NYSE/KOSPI/KOSDAQ/HKEX/TWSE/SSE/SZSE 등",
  "sector": "섹터",
  "currentPrice": 숫자,
  "fairValue": 숫자,
  "currency": "USD 또는 KRW 또는 HKD 또는 TWD 또는 CNY",
  "verdict": "투자의견 텍스트",
  "verdictType": "buy/hold/sell/watch 중 하나",
  "oneLiner": "한줄 투자의견",
  "narrative": "내러티브 전체 텍스트",
  "keyPoints": [{"num":1,"label":"레이블","content":"내용"}],
  "dealRadar": "딜레이더 내용",
  "scenarios": [
    {"type":"Bull","prob":숫자,"price":숫자,"color":"#00d27a"},
    {"type":"Base","prob":숫자,"price":숫자,"color":"#f5a623"},
    {"type":"Bear","prob":숫자,"price":숫자,"color":"#e74c3c"}
  ],
  "weightedFV": 숫자,
  "events": [{"event":"이벤트명","impact":"+X% 또는 -X%","direction":"up 또는 down"}],
  "assumptions": [{"item":"항목","value":"값","basis":"근거","sensitivity":"민감도"}],
  "sources": ["출처1","출처2"],
  "updatedAt": "YYYY-MM-DD"
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const raw = data.content?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
