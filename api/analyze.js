export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { companyName, anthropicKey, depth = "deep" } = req.body;
  if (!anthropicKey) return res.status(400).json({ error: "Anthropic API 키가 필요해요." });
  if (!companyName) return res.status(400).json({ error: "기업명을 입력해주세요." });

  const today = new Date().toISOString().slice(0, 10);
  const isDeep = depth === "deep";

  const systemPrompt = `당신은 월스트리트 투자은행 출신의 시니어 재무 분석가입니다.

■ 핵심 작동 방식
사용자가 기업명만 입력하면, 알아서 판단하여 적합한 분석을 자동 실행합니다.
질문하지 말고 바로 분석 결과를 출력하세요.
웹 검색 도구를 적극 활용하여 최신 실제 데이터를 수집하세요.

■ 할루시네이션 방어 규칙 (최우선 적용)
▸ 데이터 태깅 필수: 모든 숫자 [실제]/[추정]/[가정] 태깅
▸ 출처 없는 숫자에 [실제] 태그 금지
▸ 비교기업은 실존 상장사만 7~15개, 멀티플 지어내지 말 것
▸ 존재하지 않는 M&A 딜 생성 금지

■ 딜 레이더 — 웹 검색으로 반드시 확인
1. Pending M&A / 2. 관계사 딜 / 3. 경쟁사 딜 / 4. 규제/반독점 / 5. 주주행동주의 / 6. 대주주 지분변동
루머/공식 구분, 출처 필수.

■ 분석 프레임워크
DCF(FCFF기준) + Comps(피어7~15개) + 민감도/시나리오 + 역산검증
역산: 산출 vs 시총 괴리 명시, ±30%+ → "주의" 표기
가정테이블: 항목/적용값/근거/민감도 최소 6개

■ 출력: JSON만. 다른 텍스트 절대 없이.`;

  const depthInstruction = isDeep
    ? `【심층 분석 모드】웹 검색 5회 이상 수행. 비교기업 7개 이상. 가정 6개 이상. 이벤트 5개 이상. 역산검증+신뢰도체크 필수.`
    : `【빠른 분석 모드】웹 검색 2-3회. 비교기업 3-5개. 가정 4개. 이벤트 3개. 핵심 위주로 간결하게.`;

  const jsonSchema = `{
  "ticker":"티커","name":"회사명","market":"KR/US/HK/TW/CN_SH/CN_SZ","exchange":"거래소",
  "sector":"섹터","currency":"KRW/USD/HKD/TWD/CNY",
  "currentPrice":숫자,"fairValue":숫자,"verdict":"투자의견","verdictType":"buy/hold/sell/watch",
  "oneLiner":"현 주가는 [X] 시나리오가 Y%+ 실현 필요. Z 성공확률 X% 이하면 비싸다.",
  "narrative":"기업개요+thesis+최신실적 4-6문장 [실제]/[추정] 태깅",
  "keyPoints":[
    {"num":1,"label":"종합 판단","content":""},
    {"num":2,"label":"DCF 인사이트","content":"WACC X%[가정], 성장률 Y%[가정] 기반"},
    {"num":3,"label":"Comps 인사이트","content":"피어 실존기업명 포함"},
    {"num":4,"label":"시나리오 핵심","content":""},
    {"num":5,"label":"가장 중요한 변수","content":""},
    {"num":6,"label":"시장이 놓치고 있는 것","content":""},
    {"num":7,"label":"최대 리스크","content":"주가 ±X% 영향 수치 포함"},
    {"num":8,"label":"딜 레이더","content":"웹검색 기반 확인된 딜"},
    {"num":9,"label":"업사이드 촉매 + 신뢰도","content":"신뢰도 % 포함"},
    {"num":10,"label":"액션 아이템","content":"구체적 지표/날짜"}
  ],
  "dealRadar":"딜레이더 상세 (출처 포함)",
  "scenarios":[
    {"type":"Bull","prob":숫자,"price":숫자,"color":"#00d27a","description":"구체적 근거"},
    {"type":"Base","prob":숫자,"price":숫자,"color":"#f5a623","description":"구체적 근거"},
    {"type":"Bear","prob":숫자,"price":숫자,"color":"#e74c3c","description":"구체적 근거"}
  ],
  "weightedFV":숫자,
  "reversalCheck":"역산검증: 현시총 vs 산출가치 괴리 + 현주가 정당화 조건",
  "events":[{"event":"이벤트","impact":"+X%/-X%","direction":"up/down","desc":"근거"}],
  "assumptions":[{"item":"항목","value":"적용값","basis":"근거[실제/가정]","sensitivity":"민감도"}],
  "peers":[{"ticker":"티커","name":"기업명","metric":"멀티플종류","value":"X.Xx"}],
  "credibilityCheck":"신뢰도체크: 실제데이터비율, 불확실가정Top3, 한계점",
  "sources":["출처1 [실제]","출처2 [실제]"],
  "updatedAt":"${today}","watchType":"보유","buyPrice":"","quantity":"","history":[],"memo":"","memoLog":[]
}`;

  const userMsg = `${companyName} 분석해줘.

${depthInstruction}

출력 JSON 구조:
${jsonSchema}

필수: 확률합계 100% / 핵심인사이트 10개 모두 / 모든숫자 태깅 / JSON만 출력`;

  try {
    const tools = [{ type: "web_search_20250305", name: "web_search" }];

    let messages = [{ role: "user", content: userMsg }];
    let finalText = "";

    const callAPI = (msgs) => fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: isDeep ? 10000 : 6000,
        system: systemPrompt,
        tools,
        messages: msgs,
      }),
    }).then(r => r.json());

    let currentResponse = await callAPI(messages);
    if (currentResponse.error) return res.status(400).json({ error: currentResponse.error.message });

    // Agentic loop for web search
    for (let i = 0; i < 10; i++) {
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
            content: typeof tb.output === "string" ? tb.output : JSON.stringify(tb.output || tb.input || "검색완료"),
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

    const firstBrace = finalText.indexOf("{");
    const lastBrace = finalText.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      return res.status(500).json({ error: "분석 생성 실패. 다시 시도해주세요.", raw: finalText.slice(0, 300) });
    }

    const parsed = JSON.parse(finalText.slice(firstBrace, lastBrace + 1));
    parsed.id = Date.now().toString();
    return res.status(200).json(parsed);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
