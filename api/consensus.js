export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { ticker } = req.body;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const code = String(ticker).replace(/\D/g, "").padStart(6, "0");
  const hdrs = (ref) => ({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Referer": ref,
  });

  let result = {
    consensusTargetPrice: null,
    currentPrice: null,
    analystCount: null,
    opinions: { buy: 0, hold: 0, sell: 0, total: 0, buyPct: null, holdPct: null, sellPct: null },
    recentReports: [],
    source: "",
    fetchedAt: new Date().toLocaleString("ko-KR"),
  };

  // ── 1. FnGuide 투자의견 컨센서스 페이지 ─────────────────────
  // 실제 FnGuide URL: /SVO2/ASP/SVD_Invest.asp
  try {
    const url = `https://comp.fnguide.com/SVO2/ASP/SVD_Invest.asp?pGB=1&gicode=A${code}&cID=&MenuYn=Y&ReportGB=D&NewMenuID=139&stkGb=701`;
    const r = await fetch(url, { headers: hdrs("https://comp.fnguide.com/") });
    const html = await r.text();

    // ── 목표주가: 컨센서스 테이블에서 정확히 파싱
    // FnGuide HTML: <td class="cns_TxtR">216,417</td> 패턴
    // 또는 id="svdInvest1_Data" 블록 안의 목표주가

    // 방법 1: "목표주가" 텍스트 근처 숫자 (6자리 이상)
    const tp1 = html.match(/목표주가[\s\S]{0,500}?(\d{2,3},\d{3})/);

    // 방법 2: 컨센서스 테이블 cns_TxtR 클래스 (보통 첫번째가 목표주가)
    const tp2 = html.match(/class="[^"]*cns_TxtR[^"]*"[^>]*>\s*([\d,]+)\s*</);

    // 방법 3: 216,417 같은 6자리 컨센 목표가 (50,000~500,000 범위)
    const allNums = [...html.matchAll(/([\d]{2,3},[\d]{3}(?:,[\d]{3})?)/g)]
      .map(m => parseInt(m[1].replace(/,/g,"")))
      .filter(n => n >= 10000 && n <= 10000000);

    // 가장 신뢰도 높은 목표주가 선택
    const tp = tp1 ? parseInt(tp1[1].replace(/,/g,""))
              : tp2 ? parseInt(tp2[1].replace(/,/g,""))
              : null;

    if (tp && tp >= 10000) result.consensusTargetPrice = tp;

    // ── 추정기관수 파싱
    const anM = html.match(/추정기관수[\s\S]{0,200}?(\d+)/) ||
                html.match(/(\d+)\s*개\s*기관/) ||
                html.match(/기관수[^>]*>[^<]*?(\d+)/);
    if (anM) result.analystCount = parseInt(anM[1]);

    // ── 투자의견 점수 (4.0 = 강력매수 방식)
    // 투자의견: 1=강력매도 2=매도 3=중립 4=매수 5=강력매수
    const opScoreM = html.match(/투자의견[\s\S]{0,300}?(\d\.\d)/);
    if (opScoreM) {
      const score = parseFloat(opScoreM[1]);
      // score >= 3.5 → 매수, 2.5~3.5 → 중립, < 2.5 → 매도
      if (score >= 3.5) { result.opinions.buyPct = Math.round((score - 3.5) / 1.5 * 100 + 50); result.opinions.holdPct = 100 - result.opinions.buyPct; result.opinions.sellPct = 0; }
      else if (score >= 2.5) { result.opinions.holdPct = 60; result.opinions.buyPct = 30; result.opinions.sellPct = 10; }
      else { result.opinions.sellPct = 60; result.opinions.holdPct = 30; result.opinions.buyPct = 10; }
      result.opinions.buy = Math.round((result.opinions.buyPct || 0) / 100 * (result.analystCount || 10));
      result.opinions.hold = Math.round((result.opinions.holdPct || 0) / 100 * (result.analystCount || 10));
      result.opinions.sell = Math.round((result.opinions.sellPct || 0) / 100 * (result.analystCount || 10));
      result.opinions.total = result.opinions.buy + result.opinions.hold + result.opinions.sell;
      result.opinions.opinionScore = score;
    }

    // ── 현재가 파싱
    const prM = html.match(/현재가[\s\S]{0,100}?([\d,]{4,})/);
    if (prM) result.currentPrice = parseInt(prM[1].replace(/,/g,""));

    if (result.consensusTargetPrice) result.source = "FnGuide";

  } catch(e) { console.error("FnGuide error:", e.message); }

  // ── 2. 네이버 금융 현재가 (FnGuide에서 못 가져온 경우) ────────
  try {
    const r = await fetch(`https://finance.naver.com/item/main.naver?code=${code}`, {
      headers: hdrs("https://finance.naver.com/")
    });
    const html = await r.text();
    const pm = html.match(/id="_nowVal"[^>]*>([\d,]+)/);
    if (pm && !result.currentPrice) result.currentPrice = parseInt(pm[1].replace(/,/g,""));

    // 네이버 자체 컨센서스 목표주가 (없을 때 보조)
    if (!result.consensusTargetPrice) {
      const nt = html.match(/목표주가[^<]*<\/[^>]+>[\s\S]{0,100}?([\d,]{5,})/);
      if (nt) result.consensusTargetPrice = parseInt(nt[1].replace(/,/g,""));
    }
  } catch(e) { console.error("Naver main:", e.message); }

  // ── 3. 네이버 리서치 리포트 목록 ─────────────────────────────
  try {
    const r = await fetch(
      `https://finance.naver.com/research/company_list.naver?code=${code}&page=1`,
      { headers: hdrs("https://finance.naver.com/research/") }
    );
    const html = await r.text();
    const trs = html.split(/<tr/i);

    for (const tr of trs) {
      if (result.recentReports.length >= 8) break;
      const dateM = tr.match(/(\d{4}\.\d{2}\.\d{2})/);
      if (!dateM) continue;

      // 증권사명
      const brokerM = tr.match(/class="[^"]*company[^"]*"[^>]*>([^<]+)</) ||
                      tr.match(/target="_blank"[^>]*>\s*([^<]{2,15})\s*</);
      // 목표주가 (xxx,xxx 형태)
      const tpM = tr.match(/>\s*(\d{2,3},\d{3})\s*</);
      // 의견
      const opM = tr.match(/>\s*(매수|중립|매도)\s*</);
      // 제목
      const titleM = tr.match(/class="coment"[^>]*>\s*([^<]{2,}?)\s*</);

      if (brokerM) {
        const tp = tpM ? parseInt(tpM[1].replace(/,/g,"")) : null;
        const broker = brokerM[1].trim().slice(0, 15);
        const isDup = result.recentReports.some(r => r.broker === broker && r.date === dateM[1]);
        if (!isDup) {
          result.recentReports.push({
            broker,
            targetPrice: tp && tp >= 10000 ? tp : null,
            opinion: opM ? opM[1] : null,
            date: dateM[1],
            title: titleM ? titleM[1].trim().slice(0, 30) : "",
          });
        }
      }
    }

    if (!result.source && result.recentReports.length > 0) result.source = "네이버 금융";
    else if (result.source === "FnGuide" && result.recentReports.length > 0) result.source = "FnGuide + 네이버 금융";

    // 리포트 목표가들로 평균 재산출 (FnGuide 파싱 실패 시 백업)
    if (!result.consensusTargetPrice) {
      const tps = result.recentReports.filter(r => r.targetPrice).map(r => r.targetPrice);
      if (tps.length > 0) {
        result.consensusTargetPrice = Math.round(tps.reduce((a,b)=>a+b,0) / tps.length);
        result.source = "네이버 금융 리포트 평균";
      }
    }

  } catch(e) { console.error("Naver research:", e.message); }

  return res.status(200).json(result);
}
