// ── AnalystOS v2 — 2단계 분석 엔진 ─────────────────────────────
// 1단계: 퀀트 트레이더 (매크로 + 기업 본질 + 밸류에이션 백분위)
// 2단계: IB 분석가 (딜레이더 + DCF + Comps + 시나리오 + 10 Key Points)

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { companyName, anthropicKey, depth = "deep" } = req.body;
  if (!companyName || !anthropicKey) {
    return res.status(400).json({ error: "companyName and anthropicKey required" });
  }

  const MODEL = "claude-opus-4-6";
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  // ── 웹 검색 도구 ──────────────────────────────────────────────
  const tools = [{
    name: "web_search",
    type: "web_search_20250305",
  }];

  // ── 공통 API 호출 함수 ────────────────────────────────────────
  const callClaude = async (systemPrompt, userPrompt, maxTokens = 6000) => {
    const messages = [{ role: "user", content: userPrompt }];
    let finalText = "";
    let iterations = 0;

    while (iterations < 5) {
      iterations++;
      const body = {
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        tools,
        messages,
      };

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "web-search-2025-03-05",
        },
        body: JSON.stringify(body),
      });

      const data = await r.json();
      if (data.error) throw new Error(data.error.message);

      // 텍스트 수집
      const texts = data.content?.filter(b => b.type === "text").map(b => b.text).join("\n");
      if (texts) finalText = texts;

      if (data.stop_reason === "end_turn") break;

      // tool_use 처리
      if (data.stop_reason === "tool_use") {
        const toolUses = data.content.filter(b => b.type === "tool_use");
        messages.push({ role: "assistant", content: data.content });

        const toolResults = toolUses.map(tu => ({
          type: "tool_result",
          tool_use_id: tu.id,
          content: tu.type === "web_search"
            ? (tu.content || []).map(r => typeof r === "string"
                ? r.slice(0, 1500)
                : JSON.stringify(r).slice(0, 1500)).join("\n")
            : "검색 완료",
        }));
        messages.push({ role: "user", content: toolResults });
        continue;
      }
      break;
    }
    return finalText;
  };

  // ════════════════════════════════════════════════════════════
  // 1단계: 퀀트 분석
  // ════════════════════════════════════════════════════════════
  const QUANT_SYSTEM = `당신은 세계 최고의 밸류 퀀트 트레이더입니다. 워런 버핏, 조엘 그린블랫, 벤저민 그레이엄의 가치 투자 철학을 바탕으로 하되, 모든 판단을 정량적 데이터와 통계적 증거로 뒷받침합니다. 감정적 편향이나 서사 중심 스토리텔링은 철저히 배제하고, 냉정하고 객관적인 분석만 수행합니다.

반드시 웹 검색으로 실제 데이터를 확인한 후 분석하세요.

출력 형식 (JSON):
{
  "ticker": "",
  "name": "",
  "market": "US|KR|HK|JP",
  "exchange": "",
  "sector": "",
  "currency": "USD|KRW|HKD|JPY",
  "currentPrice": 0,
  
  "macro": {
    "environment": "긍정|중립|부정",
    "score": 0,
    "summary": "",
    "cyclePosition": "확장|정점|수축|저점",
    "keyRisks": ["", ""]
  },
  
  "industry": {
    "growthRate": 0,
    "avgROIC": 0,
    "competitiveIntensity": "높음|중간|낮음",
    "summary": ""
  },
  
  "fundamental": {
    "revenueGrowth5Y": 0,
    "operatingMargin": 0,
    "roe": 0,
    "roic": 0,
    "fcfConversion": 0,
    "debtRatio": 0,
    "earningsStability": "높음|중간|낮음",
    "moatRating": "넓음|보통|좁음|없음",
    "moatEvidence": "",
    "summary": ""
  },
  
  "valuation": {
    "per": 0,
    "pbr": 0,
    "evEbitda": 0,
    "fcfYield": 0,
    "peg": 0,
    "historicalPercentile": 0,
    "industryPercentile": 0,
    "normalizedEarnings": 0,
    "intrinsicValue": 0,
    "marginOfSafety": 0,
    "summary": ""
  },
  
  "quantVerdict": {
    "qualityScore": 0,
    "valueScore": 0,
    "momentumScore": 0,
    "overallScore": 0,
    "expectedReturn": 0,
    "riskRewardRatio": "",
    "recommendation": "Strong Buy|Buy|Hold|Reduce|Avoid",
    "bearCase": "",
    "bearCaseProb": 0
  },
  
  "dataSources": [""],
  "uncertainties": [""]
}

JSON만 반환. 다른 텍스트 없이.`;

  const QUANT_USER = `현재 날짜: ${today}
분석 대상: ${companyName}

웹 검색으로 최신 재무 데이터, 매크로 환경, 산업 동향을 수집하여 5단계 퀀트 분석을 수행하세요:
1. 매크로 환경 분석
2. 산업/섹터 분석
3. 기업 본질 분석 (가능한 최근 10년 재무 추이)
4. 밸류에이션 분석 (역사적/산업 백분위 포함)
5. 종합 퀀트 판단

JSON만 반환하세요.`;

  // ════════════════════════════════════════════════════════════
  // 2단계: IB 분석
  // ════════════════════════════════════════════════════════════
  const IB_SYSTEM = `당신은 월스트리트 투자은행 출신의 시니어 재무 분석가입니다. 제공된 퀀트 분석 결과를 바탕으로 IB 수준의 심층 분석을 수행합니다.

▸ 할루시네이션 방어: 모든 숫자 [실제]/[추정]/[가정] 태깅. 웹 검색으로 반드시 확인.
▸ 딜 레이더: M&A/IPO/규제/주주행동주의 웹 검색 필수.
▸ 비교기업: 실존 상장사만. 멀티플 지어내지 말 것.

출력 형식 (JSON):
{
  "dealRadar": {
    "items": [{"title":"","status":"루머|공식발표|규제심사중","impact":"","valImpact":""}],
    "summary": ""
  },
  
  "dcf": {
    "wacc": 0,
    "terminalGrowth": 0,
    "fairValue": 0,
    "assumptions": [{"item":"","value":"","basis":"","sensitivity":""}]
  },
  
  "comps": {
    "peers": [{"name":"","ticker":"","per":0,"evEbitda":0,"pbr":0,"revenueGrowth":0}],
    "impliedValue": 0,
    "premiumDiscount": 0,
    "summary": ""
  },
  
  "scenarios": {
    "bull": {"price":0,"prob":0,"thesis":"","catalysts":[""]},
    "base": {"price":0,"prob":0,"thesis":"","catalysts":[""]},
    "bear": {"price":0,"prob":0,"thesis":"","catalysts":[""]}
  },
  
  "weightedFairValue": 0,
  "upsideDownside": 0,
  
  "keyPoints": [
    {"no":1,"label":"최종 판단","content":""},
    {"no":2,"label":"DCF 인사이트","content":""},
    {"no":3,"label":"Comps 인사이트","content":""},
    {"no":4,"label":"시나리오 핵심","content":""},
    {"no":5,"label":"가장 중요한 변수","content":""},
    {"no":6,"label":"시장이 놓치는 것","content":""},
    {"no":7,"label":"최대 리스크","content":""},
    {"no":8,"label":"딜 레이더","content":""},
    {"no":9,"label":"업사이드 촉매","content":""},
    {"no":10,"label":"액션 아이템","content":""}
  ],
  
  "priceEvents": [{"event":"","impact":0,"impactPrice":0,"basis":""}],
  
  "verdict": "STRONG BUY|BUY|HOLD|REDUCE|AVOID",
  "verdictOneLiner": "",
  "confidence": 0,
  
  "reverseCheck": {
    "impliedGrowth": "",
    "vsMarket": "",
    "warning": ""
  },
  
  "reliability": {
    "realDataSources": [""],
    "estimateRatio": "",
    "topUncertainties": ["","",""],
    "limitations": ""
  }
}

JSON만 반환. 다른 텍스트 없이.`;

  try {
    // ── 1단계 실행 ────────────────────────────────────────────
    const quantRaw = await callClaude(QUANT_SYSTEM, QUANT_USER, depth === "deep" ? 5000 : 3000);

    // JSON 파싱
    const qf = quantRaw.indexOf("{"), ql = quantRaw.lastIndexOf("}");
    const quantData = JSON.parse(quantRaw.slice(qf, ql + 1));

    // ── 2단계 실행 (퀀트 결과 컨텍스트로 전달) ───────────────
    const IB_USER = `현재 날짜: ${today}
분석 대상: ${companyName}

━━ 1단계 퀀트 분석 결과 ━━
${JSON.stringify(quantData, null, 2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━

위 퀀트 분석을 바탕으로 웹 검색하여 IB 분석을 수행하세요:
1. 딜 레이더 (M&A/IPO/규제 현안 검색)
2. DCF 모델 (퀀트 데이터 기반, 웹 검색으로 보완)
3. 비교기업 Comps (실존 피어 7~10개)
4. Bull/Base/Bear 시나리오
5. 10 Key Points
6. 역산 검증

현재가: ${quantData.currentPrice} ${quantData.currency}

JSON만 반환하세요.`;

    const ibRaw = await callClaude(IB_SYSTEM, IB_USER, depth === "deep" ? 6000 : 4000);

    const ibf = ibRaw.indexOf("{"), ibl = ibRaw.lastIndexOf("}");
    const ibData = JSON.parse(ibRaw.slice(ibf, ibl + 1));

    // ── 최종 통합 ─────────────────────────────────────────────
    const result = {
      // 기본
      ticker: quantData.ticker,
      name: quantData.name,
      market: quantData.market,
      exchange: quantData.exchange,
      sector: quantData.sector,
      currency: quantData.currency,
      currentPrice: quantData.currentPrice,

      // 퀀트
      quant: {
        macro: quantData.macro,
        industry: quantData.industry,
        fundamental: quantData.fundamental,
        valuation: quantData.valuation,
        verdict: quantData.quantVerdict,
        sources: quantData.dataSources,
        uncertainties: quantData.uncertainties,
      },

      // IB
      ib: {
        dealRadar: ibData.dealRadar,
        dcf: ibData.dcf,
        comps: ibData.comps,
        scenarios: ibData.scenarios,
        weightedFairValue: ibData.weightedFairValue,
        upsideDownside: ibData.upsideDownside,
        keyPoints: ibData.keyPoints,
        priceEvents: ibData.priceEvents,
        verdict: ibData.verdict,
        verdictOneLiner: ibData.verdictOneLiner,
        confidence: ibData.confidence,
        reverseCheck: ibData.reverseCheck,
        reliability: ibData.reliability,
      },

      // 메타
      analyzedAt: new Date().toLocaleString("ko-KR"),
      depth,
    };

    return res.status(200).json(result);

  } catch (e) {
    console.error("Analyze error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
