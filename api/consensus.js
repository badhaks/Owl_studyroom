export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { ticker } = req.body;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const code = String(ticker).replace(/\D/g, "").padStart(6, "0");

  const hdrs = (referer) => ({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.9",
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Referer": referer,
  });

  const results = { reports: [], targetPrices: [], currentPrice: null, analystCount: null, opinions: {} };

  // ── 1. 네이버 금융 현재가 ────────────────────────────────────
  try {
    const r = await fetch(`https://finance.naver.com/item/main.naver?code=${code}`, { headers: hdrs("https://finance.naver.com/") });
    const html = await r.text();
    const pm = html.match(/id="_nowVal"[^>]*>([\d,]+)/);
    if (pm) results.currentPrice = parseInt(pm[1].replace(/,/g, ""));

    // 네이버 컨센서스 목표주가 직접 파싱
    const tpBlock = html.match(/평균\s*목표\s*주가[^<]*<\/[^>]+>[^<]*<[^>]+>([\d,]+)/);
    if (tpBlock) results.naverTP = parseInt(tpBlock[1].replace(/,/g, ""));

    // 분석가 수
    const anM = html.match(/([0-9]+)개\s*증권사/);
    if (anM) results.analystCount = parseInt(anM[1]);
  } catch (e) { console.error("Naver main:", e.message); }

  // ── 2. 네이버 금융 리서치 리포트 ────────────────────────────
  try {
    const r = await fetch(`https://finance.naver.com/research/company_list.naver?code=${code}&page=1`, {
      headers: hdrs("https://finance.naver.com/research/"),
    });
    const html = await r.text();

    // 각 tr에서 데이터 추출
    const trs = html.split(/<tr/i);
    for (const tr of trs) {
      if (results.reports.length >= 10) break;
      // 증권사명
      const brokerM = tr.match(/class="[^"]*company[^"]*"[^>]*>\s*([^<\s][^<]+?)\s*</) ||
                      tr.match(/target="_blank"[^>]*>\s*([^<]+?)\s*</);
      // 날짜
      const dateM = tr.match(/(\d{4}\.\d{2}\.\d{2})/);
      // 목표주가 (5~7자리 숫자)
      const tpM = tr.match(/>\s*([\d]{2,3},[\d]{3})\s*</);
      // 의견
      const opM = tr.match(/>\s*(매수|중립|매도)\s*</);
      // 제목
      const titleM = tr.match(/class="coment"[^>]*>\s*([^<]+)\s*</);

      if (brokerM && dateM) {
        const tp = tpM ? parseInt(tpM[1].replace(/,/g, "")) : null;
        if (tp && tp > 1000) results.targetPrices.push(tp);
        results.reports.push({
          broker: brokerM[1].trim().slice(0, 15),
          targetPrice: tp,
          opinion: opM ? opM[1] : null,
          date: dateM[1],
          title: titleM ? titleM[1].trim().slice(0, 35) : "",
        });
      }
    }
  } catch (e) { console.error("Naver research:", e.message); }

  // ── 3. FnGuide 컨센서스 (HTTPS) ──────────────────────────────
  try {
    const fnUrl = `https://comp.fnguide.com/SVO2/ASP/SVD_Invest.asp?pGB=1&gicode=A${code}&cID=&MenuYn=Y&ReportGB=D&NewMenuID=139&stkGb=701`;
    const r = await fetch(fnUrl, { headers: hdrs("https://comp.fnguide.com/") });
    const html = await r.text();

    // 목표주가
    const tpM = html.match(/목표주가[^<]*<\/th>[\s\S]{0,200}?>([\d,]+)\s*<\/td>/) ||
                html.match(/<td[^>]*>\s*([\d]{2,3},[\d]{3})\s*<\/td>/);
    if (tpM) { const v = parseInt(tpM[1].replace(/,/g,"")); if (v > 1000) results.fnTP = v; }

    // 투자의견 비율
    const buyM = html.match(/매수[^<]*<\/td>[\s\S]{0,100}?>([\d.]+)\s*%/);
    const holdM = html.match(/중립[^<]*<\/td>[\s\S]{0,100}?>([\d.]+)\s*%/);
    const sellM = html.match(/매도[^<]*<\/td>[\s\S]{0,100}?>([\d.]+)\s*%/);
    if (buyM) results.opinions.buyPct = parseFloat(buyM[1]);
    if (holdM) results.opinions.holdPct = parseFloat(holdM[1]);
    if (sellM) results.opinions.sellPct = parseFloat(sellM[1]);

    // 애널리스트 수
    const anM = html.match(/([0-9]+)\s*명/);
    if (anM && !results.analystCount) results.analystCount = parseInt(anM[1]);

    // FnGuide 리포트 파싱
    const trs = html.split(/<tr/i);
    for (const tr of trs) {
      if (results.reports.length >= 10) break;
      const brokerM = tr.match(/class="[^"]*firm[^"]*"[^>]*>([^<]+)</) ||
                      tr.match(/>[^<]*(증권|투자|자산)[^<]*</);
      const dateM = tr.match(/(\d{4}[.\-]\d{2}[.\-]\d{2})/);
      const tpM = tr.match(/>([\d]{2,3},[\d]{3})</);
      const opM = tr.match(/>(매수|중립|매도|BUY|HOLD|SELL)</);
      const titleM = tr.match(/class="[^"]*tit[^"]*"[^>]*>([^<]+)</);
      if (brokerM && dateM) {
        const tp = tpM ? parseInt(tpM[1].replace(/,/g,"")) : null;
        const broker = brokerM[0].replace(/<[^>]+>/g,"").trim().slice(0,15);
        const isDup = results.reports.some(r => r.broker === broker && r.date === dateM[1]);
        if (!isDup && broker) {
          if (tp && tp > 1000) results.targetPrices.push(tp);
          results.reports.push({ broker, targetPrice: tp, opinion: opM ? opM[1] : null, date: dateM[1], title: titleM ? titleM[1].trim().slice(0,35) : "" });
        }
      }
    }
  } catch (e) { console.error("FnGuide:", e.message); }

  // ── 4. 최종 컨센서스 계산 ────────────────────────────────────
  const consensusTP = results.fnTP || results.naverTP ||
    (results.targetPrices.length > 0
      ? Math.round(results.targetPrices.reduce((a,b)=>a+b,0) / results.targetPrices.length)
      : null);

  const reports = results.reports
    .filter((r,i,arr) => arr.findIndex(x=>x.broker===r.broker && x.date===r.date)===i)
    .sort((a,b) => b.date.localeCompare(a.date))
    .slice(0,10);

  const buyC = reports.filter(r=>r.opinion&&["매수","BUY","Outperform"].includes(r.opinion)).length;
  const holdC = reports.filter(r=>r.opinion&&["중립","HOLD","Neutral"].includes(r.opinion)).length;
  const sellC = reports.filter(r=>r.opinion&&["매도","SELL"].includes(r.opinion)).length;
  const tot = buyC+holdC+sellC;

  const upside = consensusTP && results.currentPrice
    ? (((consensusTP - results.currentPrice) / results.currentPrice)*100).toFixed(1)
    : null;

  return res.status(200).json({
    code,
    consensusTargetPrice: consensusTP,
    currentPrice: results.currentPrice,
    upsideVsConsensus: upside,
    analystCount: results.analystCount || reports.length || null,
    opinions: {
      buy: buyC, hold: holdC, sell: sellC, total: tot,
      buyPct: results.opinions.buyPct || (tot>0 ? ((buyC/tot)*100).toFixed(0) : null),
      holdPct: results.opinions.holdPct || (tot>0 ? ((holdC/tot)*100).toFixed(0) : null),
      sellPct: results.opinions.sellPct || (tot>0 ? ((sellC/tot)*100).toFixed(0) : null),
    },
    recentReports: reports,
    source: results.fnTP ? "FnGuide + 네이버 금융" : "네이버 금융",
    fetchedAt: new Date().toLocaleString("ko-KR"),
  });
}
