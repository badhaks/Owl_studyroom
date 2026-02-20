export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { companyName, anthropicKey, depth = "deep" } = req.body;
  if (!anthropicKey) return res.status(400).json({ error: "Anthropic API 키가 필요해요." });
  if (!companyName) return res.status(400).json({ error: "기업명을 입력해주세요." });

  const today = new Date().toISOString().slice(0, 10);
  const isDeep = depth === "deep";

  const systemPrompt = `IB 시니어 애널리스트. 웹검색으로 데이터 수집 후 JSON만 출력.
태깅: [실제]=검색확인 [추정]=계산 [가정]=설정. 비교기업은 실존 상장사만. JSON외 텍스트 금지.`;

  const schema = `{"ticker":"","name":"","market":"KR/US/HK/TW/CN_SH/CN_SZ","exchange":"","sector":"","currency":"KRW/USD/HKD/TWD/CNY","currentPrice":0,"fairValue":0,"verdict":"","verdictType":"buy/hold/sell/watch","oneLiner":"","narrative":"","keyPoints":[{"num":1,"label":"종합 판단","content":""},{"num":2,"label":"DCF 인사이트","content":""},{"num":3,"label":"Comps 인사이트","content":""},{"num":4,"label":"시나리오 핵심","content":""},{"num":5,"label":"가장 중요한 변수","content":""},{"num":6,"label":"시장이 놓치는 것","content":""},{"num":7,"label":"최대 리스크","content":""},{"num":8,"label":"딜 레이더","content":""},{"num":9,"label":"업사이드 촉매","content":""},{"num":10,"label":"액션 아이템","content":""}],"dealRadar":"","scenarios":[{"type":"Bull","prob":0,"price":0,"color":"#00d27a","description":""},{"type":"Base","prob":0,"price":0,"color":"#f5a623","description":""},{"type":"Bear","prob":0,"price":0,"color":"#e74c3c","description":""}],"weightedFV":0,"reversalCheck":"","events":[{"event":"","impact":"±X%","direction":"up/down","desc":""}],"assumptions":[{"item":"","value":"","basis":"","sensitivity":""}],"peers":[{"ticker":"","name":"","metric":"","value":""}],"credibilityCheck":"","sources":[""],"updatedAt":"${today}","watchType":"보유","buyPrice":"","quantity":"","history":[],"memo":"","memoLog":[]}`;

  const userMsg = `${companyName} 분석. ${isDeep ? "웹검색3회, 비교기업5개+, 가정5개+, 이벤트4개+" : "웹검색2회, 비교기업3개, 가정3개"} 확률합계100%. 스키마:${schema}`;

  const truncate = (text, max = 1500) => typeof text === "string" ? text.slice(0, max) : JSON.stringify(text).slice(0, max);

  try {
    const callAPI = (msgs) => fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: isDeep ? 6000 : 4000,
        system: systemPrompt,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: msgs,
      }),
    }).then(r => r.json());

    let messages = [{ role: "user", content: userMsg }];
    let finalText = "";
    let current = await callAPI(messages);
    if (current.error) return res.status(400).json({ error: current.error.message });

    for (let i = 0; i < 6; i++) {
      if (current.stop_reason === "end_turn") {
        finalText = current.content?.find(b => b.type === "text")?.text || "";
        break;
      }
      if (current.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: current.content });
        const results = (current.content || []).filter(b => b.type === "tool_use").map(tb => ({
          type: "tool_result",
          tool_use_id: tb.id,
          // ★ 핵심: 검색결과 1500자로 잘라서 토큰 폭발 방지
          content: truncate(tb.output || tb.input || "검색완료"),
        }));
        messages.push({ role: "user", content: results });
        current = await callAPI(messages);
        if (current.error) return res.status(400).json({ error: current.error.message });
      } else {
        finalText = current.content?.find(b => b.type === "text")?.text || "";
        break;
      }
    }

    if (!finalText) finalText = current.content?.find(b => b.type === "text")?.text || "";
    const f = finalText.indexOf("{"), l = finalText.lastIndexOf("}");
    if (f === -1 || l === -1) return res.status(500).json({ error: "분석 생성 실패. 다시 시도해주세요." });
    const parsed = JSON.parse(finalText.slice(f, l + 1));
    parsed.id = Date.now().toString();
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
