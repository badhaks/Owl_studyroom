export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { companyName, anthropicKey, depth = "deep" } = req.body;
  if (!anthropicKey) return res.status(400).json({ error: "Anthropic API 키가 필요해요." });
  if (!companyName) return res.status(400).json({ error: "기업명을 입력해주세요." });

  const today = new Date().toISOString().slice(0, 10);
  const isDeep = depth === "deep";

  // ── 시스템 프롬프트 (압축) ──────────────────────────────────
  const systemPrompt = `당신은 월스트리트 IB 시니어 재무 분석가입니다. 웹 검색으로 최신 데이터를 수집 후 JSON만 출력하세요.

태깅규칙: [실제]=검색확인 [추정]=계산값 [가정]=설정값. 출처없이 [실제] 금지.
비교기업: 실존 상장사만. 멀티플 지어내기 금지.
딜레이더: 검색확인만. 루머/공식 구분.
역산검증: 산출 vs 시총 괴리 명시. ±30%+ → "주의".

출력: JSON만. 다른 텍스트 절대 없이.`;

  // ── JSON 스키마 (간결화) ──────────────────────────────────
  const schema = `{
"ticker":"","name":"","market":"KR/US/HK/TW/CN_SH/CN_SZ","exchange":"",
"sector":"","currency":"KRW/USD/HKD/TWD/CNY",
"currentPrice":0,"fairValue":0,"verdict":"","verdictType":"buy/hold/sell/watch",
"oneLiner":"현 주가는 X 실현 필요. Y 확률 Z% 이하면 비싸다.",
"narrative":"4-6문장. [실제]/[추정] 태깅",
"keyPoints":[
{"num":1,"label":"종합 판단","content":""},
{"num":2,"label":"DCF 인사이트","content":"WACC X%[가정]"},
{"num":3,"label":"Comps 인사이트","content":"피어기업명 포함"},
{"num":4,"label":"시나리오 핵심","content":""},
{"num":5,"label":"가장 중요한 변수","content":""},
{"num":6,"label":"시장이 놓치고 있는 것","content":""},
{"num":7,"label":"최대 리스크","content":"주가 ±X% 포함"},
{"num":8,"label":"딜 레이더","content":""},
{"num":9,"label":"업사이드 촉매","content":"신뢰도% 포함"},
{"num":10,"label":"액션 아이템","content":"구체적 지표/날짜"}],
"dealRadar":"",
"scenarios":[
{"type":"Bull","prob":0,"price":0,"color":"#00d27a","description":""},
{"type":"Base","prob":0,"price":0,"color":"#f5a623","description":""},
{"type":"Bear","prob":0,"price":0,"color":"#e74c3c","description":""}],
"weightedFV":0,
"reversalCheck":"시총 vs 산출가치 괴리 + 주가 정당화 조건",
"events":[{"event":"","impact":"±X%","direction":"up/down","desc":""}],
"assumptions":[{"item":"","value":"","basis":"[실제/가정]","sensitivity":""}],
"peers":[{"ticker":"","name":"","metric":"","value":""}],
"credibilityCheck":"실제데이터비율, 불확실가정Top3, 한계점",
"sources":["[실제]"],
"updatedAt":"${today}","watchType":"보유","buyPrice":"","quantity":"","history":[],"memo":"","memoLog":[]
}`;

  const depthNote = isDeep
    ? "심층분석: 웹검색 5회+, 비교기업 7개+, 가정 6개+, 이벤트 5개+"
    : "빠른분석: 웹검색 2-3회, 비교기업 3-5개, 가정 4개, 이벤트 3개";

  const userMsg = `${companyName} 분석. ${depthNote}
확률합계 100%. 키포인트 10개 모두. 숫자 태깅 필수. JSON만 출력.
스키마: ${schema}`;

  try {
    const tools = [{ type: "web_search_20250305", name: "web_search" }];
    const callAPI = (msgs) => fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: isDeep ? 8000 : 5000,
        system: systemPrompt,
        tools,
        messages: msgs,
      }),
    }).then(r => r.json());

    let messages = [{ role: "user", content: userMsg }];
    let finalText = "";
    let currentResponse = await callAPI(messages);
    if (currentResponse.error) return res.status(400).json({ error: currentResponse.error.message });

    for (let i = 0; i < 8; i++) {
      if (currentResponse.stop_reason === "end_turn") {
        finalText = currentResponse.content?.find(b => b.type === "text")?.text || "";
        break;
      }
      if (currentResponse.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: currentResponse.content });
        const toolResults = (currentResponse.content || [])
          .filter(b => b.type === "tool_use")
          .map(tb => ({
            type: "tool_result",
            tool_use_id: tb.id,
            content: typeof tb.output === "string" ? tb.output : JSON.stringify(tb.output || "검색완료"),
          }));
        messages.push({ role: "user", content: toolResults });
        currentResponse = await callAPI(messages);
        if (currentResponse.error) return res.status(400).json({ error: currentResponse.error.message });
      } else {
        finalText = currentResponse.content?.find(b => b.type === "text")?.text || "";
        break;
      }
    }

    if (!finalText) finalText = currentResponse.content?.find(b => b.type === "text")?.text || "";

    const first = finalText.indexOf("{");
    const last = finalText.lastIndexOf("}");
    if (first === -1 || last === -1) return res.status(500).json({ error: "분석 생성 실패. 다시 시도해주세요." });

    const parsed = JSON.parse(finalText.slice(first, last + 1));
    parsed.id = Date.now().toString();
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
