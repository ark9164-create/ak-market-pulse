export const RSS_FEEDS: { name: string; url: string }[] = [
  // Major wires & broadsheets
  { name: 'MarketWatch',     url: 'https://feeds.marketwatch.com/marketwatch/topstories' },
  { name: 'MarketWatch Mkts', url: 'https://feeds.marketwatch.com/marketwatch/marketpulse' },
  { name: 'CNBC',            url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114' },
  { name: 'CNBC Markets',    url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258' },
  { name: 'CNBC Earnings',   url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839135' },
  { name: 'NYT',              url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' },
  { name: 'NYT Business',    url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml' },
  { name: 'NYT Economy',     url: 'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml' },
  { name: 'BBC Business',    url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { name: 'Guardian Biz',    url: 'https://www.theguardian.com/business/rss' },
  { name: 'AP News',          url: 'https://feedx.net/rss/ap.xml' },
  { name: 'BBC World',       url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  // Reuters via Google News (Reuters killed their direct RSS)
  { name: 'Reuters',         url: 'https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com&hl=en-US&gl=US&ceid=US:en' },
  // FT / Bloomberg / WSJ
  { name: 'FT',              url: 'https://www.ft.com/rss/home' },
  { name: 'WSJ Markets',     url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml' },
  { name: 'WSJ Business',    url: 'https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml' },
  { name: 'Bloomberg',       url: 'https://feeds.bloomberg.com/markets/news.rss' },
  // Specialized
  { name: 'Yahoo Finance',   url: 'https://finance.yahoo.com/news/rssindex' },
  { name: 'Seeking Alpha',   url: 'https://seekingalpha.com/market_currents.xml' },
  { name: 'Wired Biz',       url: 'https://www.wired.com/feed/category/business/latest/rss' },
  // Crain's via Google News
  { name: "Crain's NY",      url: 'https://news.google.com/rss/search?q=when:7d+site:crainsnewyork.com&hl=en-US&gl=US&ceid=US:en' },
  // Macro / Central Bank
  { name: 'Fed',             url: 'https://www.federalreserve.gov/feeds/press_all.xml' },
  { name: 'ECB',             url: 'https://www.ecb.europa.eu/rss/press.html' },
  // Crypto
  { name: 'CoinDesk',        url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
];
