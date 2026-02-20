export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { ticker } = req.body;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const code = ticker.padStart(6, "0");

  try {
    // 1. 네이버 금융 메인 페이지 (투자의견 + 목표주가 컨센서스)
    const mainRes = await fetch(`https://finance.naver.com/item/main.naver?code=${code}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });
    const html = await mainRes.text();

    // 투자의견 파싱 (매수/중립/매도 분포)
    const opinionMatch = html.match(/투자의견[^<]*<[^>]+>[^<]*<[^>]+>([^<]+)</);
    
    // 목표주가 컨센서스 파싱
    const targetMatch = html.match(/목표주가[^<]*<[^>]+>[^<]*<[^>]+>([0-9,]+)/);
    
    // 현재가 파싱
    const priceMatch = html.match(/id="_nowVal"[^>]*>([0-9,]+)/);

    // 2. 리서치 리포트 목록 (최근 레포트)
    const reportRes = await fetch(`https://finance.naver.com/research/company_list.naver?code=${code}&page=1`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });
    const reportHtml = await reportRes.text();

    // 레포트 파싱 (증권사명, 목표가, 의견, 날짜)
    const reports = [];
    const reportPattern = /<tr[^>]*class="[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
    let match;
    let count = 0;

    // 더 간단한 파싱 - td 기반
    const rows = reportHtml.split("<tr");
    for (const row of rows) {
      if (count >= 10) break;
      if (!row.includes("company_list")) continue;

      // 증권사
      const brokerMatch = row.match(/target="_blank"[^>]*>([^<]+)<\/a>/);
      // 목표가
      const tpMatch = row.match(/([0-9]{4,6},[0-9]{3}|[0-9]{5,7})(?=\s*<\/td>)/);
      // 의견
      const opMatch = row.match(/(매수|중립|매도|Outperform|Buy|Hold|Sell)/);
      // 날짜
      const dateMatch = row.match(/(\d{4}\.\d{2}\.\d{2})/);
      // 제목
      const titleMatch = row.match(/class="coment"[^>]*>([^<]+)</);

      if (brokerMatch && dateMatch) {
        reports.push({
          broker: brokerMatch[1].trim(),
          targetPrice: tpMatch ? parseInt(tpMatch[1].replace(/,/g, "")) : null,
          opinion: opMatch ? opMatch[1] : null,
          date: dateMatch[1],
          title: titleMatch ? titleMatch[1].trim() : "",
        });
        count++;
      }
    }

    // 컨센서스 계산 (레포트에서 목표가 평균)
    const validTPs = reports.filter(r => r.targetPrice && r.targetPrice > 1000);
    const avgTargetPrice = validTPs.length > 0
      ? Math.round(validTPs.reduce((s, r) => s + r.targetPrice, 0) / validTPs.length)
      : null;

    const buyCount = reports.filter(r => r.opinion && ["매수", "Buy", "Outperform", "Strong Buy"].includes(r.opinion)).length;
    const holdCount = reports.filter(r => r.opinion && ["중립", "Hold", "Neutral"].includes(r.opinion)).length;
    const sellCount = reports.filter(r => r.opinion && ["매도", "Sell", "Underperform", "Reduce"].includes(r.opinion)).length;
    const totalOpinion = buyCount + holdCount + sellCount;

    // 네이버 금융에서 직접 목표가 컨센서스 파싱 시도
    // consensus_tab 영역 파싱
    const consMatch = html.match(/평균\s*목표주가[^0-9]*([0-9,]+)/);
    const analystCountMatch = html.match(/([0-9]+)\s*개\s*증권사/);
    
    const naverTargetPrice = consMatch
      ? parseInt(consMatch[1].replace(/,/g, ""))
      : avgTargetPrice;
    
    const analystCount = analystCountMatch
      ? parseInt(analystCountMatch[1])
      : reports.length;

    const currentPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, "")) : null;
    const upside = naverTargetPrice && currentPrice
      ? (((naverTargetPrice - currentPrice) / currentPrice) * 100).toFixed(1)
      : null;

    return res.status(200).json({
      code,
      consensusTargetPrice: naverTargetPrice,
      currentPrice,
      upsideVsConsensus: upside,
      analystCount,
      opinions: {
        buy: buyCount,
        hold: holdCount,
        sell: sellCount,
        total: totalOpinion,
        buyPct: totalOpinion > 0 ? ((buyCount / totalOpinion) * 100).toFixed(0) : null,
        holdPct: totalOpinion > 0 ? ((holdCount / totalOpinion) * 100).toFixed(0) : null,
        sellPct: totalOpinion > 0 ? ((sellCount / totalOpinion) * 100).toFixed(0) : null,
      },
      recentReports: reports.slice(0, 8),
      source: "네이버 금융",
      fetchedAt: new Date().toLocaleString("ko-KR"),
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
