export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { ticker, market, apiKey } = req.body;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  // Build Yahoo Finance symbol
  const suffixMap = { KR: ".KS", HK: ".HK", TW: ".TW", CN_SH: ".SS", CN_SZ: ".SZ" };
  const suffix = suffixMap[market] || "";
  const t = market === "KR" ? ticker.padStart(6, "0") : ticker;
  const symbol = suffix ? `${t}${suffix}` : t;

  // 1) Try Alpha Vantage if key provided
  if (apiKey) {
    try {
      const avUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
      const avRes = await fetch(avUrl);
      const avData = await avRes.json();
      if (!avData.Note && !avData.Information) {
        const price = parseFloat(avData?.["Global Quote"]?.["05. price"]);
        if (!isNaN(price) && price > 0) {
          return res.status(200).json({ price, source: "alphavantage", symbol });
        }
      }
    } catch {}
  }

  // 2) Fallback: Yahoo Finance via query2
  try {
    const yhUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const yhRes = await fetch(yhUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const yhData = await yhRes.json();
    const price = yhData?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price && price > 0) {
      return res.status(200).json({ price, source: "yahoo", symbol });
    }
  } catch {}

  return res.status(404).json({ error: `가격을 가져올 수 없어요 (심볼: ${symbol})` });
}
