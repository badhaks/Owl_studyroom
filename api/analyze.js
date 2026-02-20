export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { companyName, anthropicKey } = req.body;
  if (!anthropicKey) return res.status(400).json({ error: "Anthropic API 키가 필요해요." });
  if (!companyName) return res.status(400).json({ error: "기업명을 입력해주세요." });

  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `당신은 월스트리트 투자은행 출신의 시니어 재무 분석가입니다.

■ 할루시네이션 방어 규칙 (최우선 적용)
▸ 데이터 태깅 필수: 모든 숫자를 [실제] / [추정] / [가정] 으로 태깅
▸ 출처 없는 숫자에 [실제] 태그 금지
▸ 비상장 재무, 미반영 실적, 불확실 관행 → 반드시 불확실성 명시
▸ 숫자 지어내기 금지 — 검색 불가 시 "사용자 직접 입력 시 정확한 모델 산출 가능" 안내
▸ 비교기업은 실존 상장사만, 멀티플 지어내지 말 것

■ 출력 형식 (반드시 JSON으로만 응답, 다른 텍스트 없이)
{
  "ticker": "티커심볼 (예: 005930, AAPL, 0700)",
  "name": "회사명",
  "market": "KR 또는 US 또는 HK 또는 TW 또는 CN_SH 또는 CN_SZ",
  "exchange": "KOSPI/KOSDAQ/NASDAQ/NYSE/HKEX/TWSE 등",
  "sector": "섹터명",
  "currency": "KRW 또는 USD 또는 HKD 등",
  "currentPrice": 숫자 (최근 종가, 실제 기준),
  "fairValue": 숫자 (DCF+Comps 기반 적정가),
  "verdict": "투자의견 (예: Selective Buy, Hold, Reduce 등)",
  "verdictType": "buy 또는 hold 또는 sell 또는 watch",
  "oneLiner": "한줄 투자판단 (현재 주가는 ... 필요. ... 성공 확률 X% 이하면 비싸다)",
  "narrative": "기업 개요 + 핵심 thesis 3-5문장",
  "keyPoints": [
    {"num":1,"label":"종합 판단","content":"..."},
    {"num":2,"label":"DCF 인사이트","content":"..."},
    {"num":3,"label":"Comps 인사이트","content":"..."},
    {"num":4,"label":"시나리오 핵심","content":"..."},
    {"num":5,"label":"가장 중요한 변수","content":"..."},
    {"num":6,"label":"시장이 놓치고 있는 것","content":"..."},
    {"num":7,"label":"최대 리스크","content":"..."},
    {"num":8,"label":"딜 레이더","content":"..."},
    {"num":9,"label":"업사이드 촉매 + 신뢰도","content":"..."},
    {"num":10,"label":"액션 아이템","content":"..."}
  ],
  "dealRadar": "딜 레이더 상세 내용",
  "scenarios": [
    {"type":"Bull","prob":숫자,"price":숫자,"color":"#00d27a","description":"Bull 시나리오 근거"},
    {"type":"Base","prob":숫자,"price":숫자,"color":"#f5a623","description":"Base 시나리오 근거"},
    {"type":"Bear","prob":숫자,"price":숫자,"color":"#e74c3c","description":"Bear 시나리오 근거"}
  ],
  "weightedFV": 숫자 (확률가중 적정가),
  "events": [
    {"event":"이벤트명","impact":"+X% 또는 -X%","direction":"up 또는 down","desc":"설명"}
  ],
  "assumptions": [
    {"item":"가정항목","value":"적용값","basis":"근거","sensitivity":"민감도"}
  ],
  "sources": ["출처1 [실제]", "출처2 [실제]"],
  "updatedAt": "${today}",
  "watchType": "보유",
  "buyPrice": "",
  "quantity": "",
  "history": [],
  "memo": "",
  "memoLog": []
}`;

  const userMsg = `${companyName} 분석해줘.

DCF + Comps + 민감도 + Bull/Base/Bear 시나리오 + 딜 레이더 포함해서 완전한 IB 수준 분석을 JSON 형식으로만 출력해줘.
- 확률 합계 반드시 100%
- 가정 테이블 최소 4개 항목
- 이벤트 임팩트 최소 4개
- 핵심 인사이트 10개 모두 채우기
- 출처 최소 3개 이상
- 숫자는 반드시 [실제]/[추정]/[가정] 태깅
- JSON 외 다른 텍스트 절대 출력하지 말 것`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const raw = data.content?.[0]?.text || "";
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      return res.status(500).json({ error: "분석 생성 실패. 다시 시도해주세요.", raw });
    }
    const jsonStr = raw.slice(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(jsonStr);
    parsed.id = Date.now().toString();
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
