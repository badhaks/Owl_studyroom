export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { ticker, name, market } = req.body;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const query = encodeURIComponent(`${ticker} ${name || ""} stock`);
  const results = [];

  // Try Yahoo Finance RSS
  try {
    const yahooRss = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`;
    const r = await fetch(yahooRss, { headers: { "User-Agent": "Mozilla/5.0" } });
    const text = await r.text();
    const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
    for (const item of items.slice(0, 6)) {
      const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || "";
      const link = (item.match(/<link>(.*?)<\/link>/))?.[1] || "";
      const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/))?.[1] || "";
      if (title) results.push({
        title: title.trim(),
        link: link.trim(),
        date: pubDate ? new Date(pubDate).toLocaleDateString("ko-KR") : "",
        source: "Yahoo Finance",
      });
    }
  } catch {}

  // Try Google News RSS if not enough results
  if (results.length < 3) {
    try {
      const googleRss = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
      const r = await fetch(googleRss, { headers: { "User-Agent": "Mozilla/5.0" } });
      const text = await r.text();
      const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];
      for (const item of items.slice(0, 6)) {
        const title = (item.match(/<title>(.*?)<\/title>/))?.[1]?.replace(/<[^>]+>/g, "") || "";
        const link = (item.match(/<link\/>(.*?)<guid/))?.[1]?.trim() || "";
        const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/))?.[1] || "";
        const source = (item.match(/<source[^>]*>(.*?)<\/source>/))?.[1] || "Google News";
        if (title && !results.find(r => r.title === title)) {
          results.push({
            title: title.trim(),
            link: link || `https://news.google.com/search?q=${query}`,
            date: pubDate ? new Date(pubDate).toLocaleDateString("ko-KR") : "",
            source: source.trim(),
          });
        }
      }
    } catch {}
  }

  if (results.length === 0) {
    // Return direct links as fallback
    return res.status(200).json({
      news: [],
      fallbackLinks: [
        { label: "Yahoo Finance 뉴스", url: `https://finance.yahoo.com/quote/${ticker}/news` },
        { label: "Google 뉴스 검색", url: `https://news.google.com/search?q=${query}` },
        { label: "Seeking Alpha", url: `https://seekingalpha.com/symbol/${ticker}/news` },
      ]
    });
  }

  return res.status(200).json({ news: results.slice(0, 8) });
}
