import type { Metadata } from "next";

export type SeoPageType = "general" | "feature" | "market";

export interface SeoFaqItem {
  q: string;
  a: string;
}

export interface SeoDataPoint {
  icon: string;
  label: string;
  description?: string;
}

export interface SeoUseCase {
  icon: string;
  title: string;
  desc: string;
}

export interface SeoPageContent {
  intro: string;
  purposeHeading?: string;
  purposeText?: string;
  dataPoints?: SeoDataPoint[];
  useCases?: SeoUseCase[];
  faqs?: SeoFaqItem[];
  relatedFeatures?: string[];
  relatedProviders?: string[];
  heroCtaUrl?: string;
}

export interface SeoPageConfig {
  slug: string;
  type: SeoPageType;
  title: string;
  description: string;
  h1: string;
  canonicalPath: string;
  includeInSitemap: boolean;
  content?: SeoPageContent;
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  avanmarket: "AvanMarket",
  bitskins: "BitSkins",
  buff163: "BUFF163",
  buffmarket: "BuffMarket",
  c5: "C5Game",
  csdeals: "CS.Deals",
  csfloat: "CSFloat",
  csgo500: "CSGO500",
  csgoempire: "CSGOEmpire",
  csmoney_m: "CS.Money Market",
  csmoney_t: "CS.Money Trade",
  cstrade: "CS.Trade",
  dmarket: "DMarket",
  ecosteam: "Eco Steam",
  haloskins: "HaloSkins",
  itradegg: "iTrade.gg",
  lisskins: "LisSkins",
  lootfarm: "Loot.Farm",
  mannco: "Mannco.Store",
  marketcsgo: "Market.CSGO",
  pirateswap: "PirateSwap",
  rapidskins: "RapidSkins",
  shadowpay: "ShadowPay",
  skinbaron: "SkinBaron",
  skinflow: "SkinFlow",
  skinout: "SkinOut",
  skinplace: "SkinPlace",
  skinport: "Skinport",
  skinscom: "Skins.com",
  skinsmonkey: "SkinsMonkey",
  skinswap: "SkinSwap",
  skinvault: "SkinVault",
  steam: "Steam",
  swapgg: "Swap.gg",
  tradeit: "Tradeit.gg",
  waxpeer: "Waxpeer",
  whitemarket: "WhiteMarket",
  youpin: "YouPin",
};

/* ---------- Priority page content ---------- */

const CS2_API_CONTENT: SeoPageContent = {
  intro:
    "Access CS2 skin market data from multiple marketplaces through a single RESTful API. Retrieve real-time pricing, buy orders, recent sales, historical snapshots, candlestick charts, and market analytics across supported providers.",
  purposeHeading: "UNIFIED MARKETPLACE DATA",
  purposeText:
    "CS2Cap aggregates data from supported CS2 skin marketplaces into one normalized API. Query prices, bids, sales records, and analytics without building separate integrations for each marketplace.",
  dataPoints: [
    { icon: "DollarSign", label: "REAL-TIME PRICING", description: "Lowest ask and quantity data from supported marketplaces, queryable by item or in bulk via batch endpoints." },
    { icon: "TrendingUp", label: "BUY ORDERS", description: "Highest bid and bid count data from marketplaces that support buy orders." },
    { icon: "Clock", label: "PRICE HISTORY", description: "Historical price snapshots and OHLCV candlestick data with intervals starting at 5 minutes." },
    { icon: "BarChart3", label: "MARKET ANALYTICS", description: "Cross-marketplace spreads, liquidity scores, volume metrics, and price change rates." },
    { icon: "FileJson", label: "ITEM CATALOG", description: "Full CS2 item database with metadata including rarity, collection, wear range, and images." },
    { icon: "Receipt", label: "RECENT SALES", description: "Sale records with price, float value, and paint seed where available from supported providers." },
  ],
  useCases: [
    { icon: "Terminal", title: "TRADING AUTOMATION", desc: "Build bots that read cross-marketplace pricing and buy orders to execute trades programmatically." },
    { icon: "Globe", title: "PRICE COMPARISON", desc: "Query multiple providers in one request to find the lowest ask or highest bid across marketplaces." },
    { icon: "BarChart3", title: "ANALYTICS & CHARTING", desc: "Use candlestick data and historical snapshots to build charts, dashboards, and market trackers." },
    { icon: "Layers", title: "INVENTORY VALUATION", desc: "Fetch batch prices for item collections to calculate portfolio values at current market rates." },
  ],
  faqs: [
    { q: "How many marketplaces does CS2Cap cover?", a: "CS2Cap aggregates data from 40+ CS2 skin marketplaces. The exact list of supported providers is available via the /providers endpoint." },
    { q: "What data formats are returned?", a: "All endpoints return JSON. Request and response schemas follow a consistent structure documented in the OpenAPI specification." },
    { q: "How do I authenticate?", a: "The API uses Bearer token authentication. Sign in to generate an API key and include it in the Authorization header of your requests." },
    { q: "Is historical data available?", a: "Yes. The API provides historical price snapshots and OHLCV candlestick data with intervals starting at 5 minutes." },
  ],
  relatedFeatures: ["cs2-price-api", "cs2-buy-order-api", "cs2-price-history-api", "cs2-sales-api", "cs2-item-catalog-api", "cs2-market-analytics-api"],
};

const CSGO_API_CONTENT: SeoPageContent = {
  intro:
    "CS:GO skin data is fully supported under the CS2 umbrella. CS2Cap provides the same market data, pricing, and analytics for items historically known as CS:GO skins through one unified API.",
  purposeHeading: "CS:GO SKIN DATA UNDER CS2",
  purposeText:
    "Whether you search for CS:GO or CS2 skin data, the same API and item catalog applies. CS2Cap normalizes marketplace data across providers regardless of how each marketplace labels items.",
  dataPoints: [
    { icon: "DollarSign", label: "PRICING", description: "Real-time lowest ask data across supported marketplaces for all CS2/CS:GO items." },
    { icon: "TrendingUp", label: "BUY ORDERS", description: "Highest bid and bid depth from providers that support buy order data." },
    { icon: "Clock", label: "HISTORICAL DATA", description: "Price snapshots and candlestick charts with intervals from 5 minutes up." },
    { icon: "FileJson", label: "ITEM CATALOG", description: "Complete item database with metadata, rarity, wear ranges, and collection data." },
  ],
  useCases: [
    { icon: "Terminal", title: "LEGACY INTEGRATION", desc: "Migrate existing CS:GO tools to CS2 data without changing your integration approach." },
    { icon: "Globe", title: "CROSS-MARKET PRICING", desc: "Compare prices across marketplaces for items regardless of CS:GO or CS2 labeling." },
    { icon: "BarChart3", title: "HISTORICAL ANALYSIS", desc: "Track price trends across the CS:GO-to-CS2 transition using historical snapshots." },
    { icon: "Layers", title: "PORTFOLIO TOOLS", desc: "Value CS:GO/CS2 inventories using current multi-marketplace pricing data." },
  ],
  faqs: [
    { q: "Is this different from the CS2 API?", a: "No. CS2Cap serves the same data for CS:GO and CS2 items. This page exists for users searching with CS:GO terminology." },
    { q: "Are all CS:GO items included?", a: "The item catalog covers CS2 items, which includes all items previously known as CS:GO skins." },
    { q: "How do I get started?", a: "Sign up, generate an API key, and start making requests. The API reference on /api-info documents all available endpoints." },
  ],
  relatedFeatures: ["cs2-price-api", "cs2-buy-order-api", "cs2-price-history-api", "cs2-item-catalog-api"],
};

const CS2_PRICE_API_CONTENT: SeoPageContent = {
  intro:
    "Retrieve real-time CS2 skin prices from supported marketplaces. Query lowest ask and listing quantity by item, or fetch prices in bulk using the batch endpoint.",
  purposeHeading: "MULTI-MARKETPLACE PRICING",
  purposeText:
    "The Prices API returns the lowest ask price and listing quantity for CS2 items across supported providers. You can query by item ID or market hash name, filter by provider, and retrieve results with pagination. The batch endpoint accepts multiple item IDs in a single request.",
  dataPoints: [
    { icon: "DollarSign", label: "LOWEST ASK", description: "Current lowest listed price per provider, returned with listing quantity and timestamp." },
    { icon: "Layers", label: "BATCH PRICING", description: "Submit multiple item IDs in one POST request to get quotes from all queried providers." },
    { icon: "Globe", label: "MULTI-PROVIDER", description: "Each response includes data from all providers that have active listings for the queried item." },
    { icon: "Filter", label: "PROVIDER FILTERING", description: "Optionally restrict results to specific providers using the requested_providers parameter." },
  ],
  useCases: [
    { icon: "Terminal", title: "BEST-PRICE LOOKUP", desc: "Find the cheapest listing across all supported marketplaces for any item in a single request." },
    { icon: "Globe", title: "COMPARISON WIDGETS", desc: "Build price comparison tools that show users listing data from multiple providers side by side." },
    { icon: "BarChart3", title: "SPREAD ANALYSIS", desc: "Compare lowest ask across providers to identify pricing discrepancies between marketplaces." },
    { icon: "Layers", title: "BULK VALUATION", desc: "Use the batch endpoint to price entire inventories or watchlists in one call." },
  ],
  faqs: [
    { q: "How many providers are queried per request?", a: "By default, all supported providers are queried. You can restrict this using the requested_providers filter." },
    { q: "What currency is pricing returned in?", a: "Prices are returned in the currency specified in the request. The currency is included in the response metadata." },
    { q: "How does batch pricing work?", a: "POST an array of item IDs to the batch endpoint. The response returns the lowest ask from each provider for every requested item." },
    { q: "Are listing quantities included?", a: "Yes. Each price entry includes the quantity of listings at that price point." },
  ],
  relatedFeatures: ["cs2-buy-order-api", "cs2-price-history-api", "cs2-sales-api", "cs2-market-analytics-api"],
  relatedProviders: ["buff163-api", "csfloat-api", "skinport-api", "steam-api"],
  heroCtaUrl: "https://docs.cs2cap.com/api-reference/prices/#list-prices",
};

const CS2_BUY_ORDER_API_CONTENT: SeoPageContent = {
  intro:
    "Access CS2 skin buy order data from marketplaces that support bids. Retrieve the highest bid price and bid count per item across supported providers.",
  purposeHeading: "BID DATA FROM SUPPORTED MARKETS",
  purposeText:
    "The Buy Orders API returns the highest bid and number of active bids for CS2 items from providers that support buy order data. Not all marketplaces offer buy orders — the API queries only those that do and returns which providers were checked in the response metadata.",
  dataPoints: [
    { icon: "TrendingUp", label: "HIGHEST BID", description: "The top bid price per provider for the queried item, with bid count." },
    { icon: "Database", label: "BID COUNT", description: "Number of active buy orders at the highest bid level for each provider." },
    { icon: "Globe", label: "PROVIDER COVERAGE", description: "Buy order data from providers including BUFF163, C5Game, CSFloat, DMarket, Steam, Waxpeer, YouPin, and others." },
    { icon: "FileJson", label: "RESPONSE METADATA", description: "Each response includes which providers were queried and the currency used." },
  ],
  useCases: [
    { icon: "Terminal", title: "INSTANT SELL PRICING", desc: "Determine the best instant-sell price by checking the highest bid across supported marketplaces." },
    { icon: "BarChart3", title: "SPREAD CALCULATION", desc: "Compare highest bid to lowest ask to calculate the bid-ask spread for any item." },
    { icon: "Globe", title: "ARBITRAGE DETECTION", desc: "Find items where the highest bid on one marketplace exceeds the lowest ask on another." },
    { icon: "Layers", title: "DEMAND TRACKING", desc: "Monitor bid counts to gauge demand levels across marketplaces." },
  ],
  faqs: [
    { q: "Which providers support buy orders?", a: "Buy order data is available from providers including BUFF163, BuffMarket, C5Game, CSFloat, DMarket, Eco Steam, Market.CSGO, Steam, Waxpeer, WhiteMarket, and YouPin." },
    { q: "Are all items covered?", a: "Buy order data depends on marketplace availability. If a provider has no active bids for an item, it will not appear in the response." },
    { q: "Can I filter by provider?", a: "Yes. Use the requested_providers parameter to query specific marketplaces only." },
  ],
  relatedFeatures: ["cs2-price-api", "cs2-market-arbitrage-api", "cs2-market-analytics-api"],
  relatedProviders: ["buff163-api", "c5-api", "csfloat-api", "steam-api", "youpin-api"],
  heroCtaUrl: "https://docs.cs2cap.com/api-reference/bids/#list-bds",
};

const CS2_PRICE_HISTORY_API_CONTENT: SeoPageContent = {
  intro:
    "Retrieve historical CS2 skin pricing data as time-series snapshots or OHLCV candlestick charts. Track price movements over time with intervals starting at 5 minutes.",
  purposeHeading: "TIME-SERIES PRICE DATA",
  purposeText:
    "The Price History API provides two types of historical data: price snapshots (individual data points with provider, price, and timestamp) and candlestick data (aggregated OHLCV bars). Candlestick intervals are available from 5 minutes up. Both endpoints support filtering by item, provider, and time range.",
  dataPoints: [
    { icon: "Clock", label: "PRICE SNAPSHOTS", description: "Individual historical price points with timestamp, provider, price, currency, and quantity." },
    { icon: "CandlestickChart", label: "OHLCV CANDLES", description: "Aggregated open/high/low/close/volume bars with configurable intervals from 5 minutes." },
    { icon: "Filter", label: "TIME RANGE FILTERS", description: "Filter snapshots and candles by start and end timestamps." },
    { icon: "Globe", label: "PROVIDER BREAKDOWN", description: "Candlestick data includes which provider contributed the high and low for each bar." },
  ],
  useCases: [
    { icon: "BarChart3", title: "PRICE CHARTS", desc: "Build interactive price charts using candlestick data with customizable time intervals." },
    { icon: "TrendingUp", title: "TREND ANALYSIS", desc: "Track price trends over days, weeks, or months using historical snapshots." },
    { icon: "Terminal", title: "BACKTESTING", desc: "Use historical data to test trading strategies against past market conditions." },
    { icon: "Layers", title: "REPORTING", desc: "Generate periodic price reports for items or portfolios using time-range filtered data." },
  ],
  faqs: [
    { q: "What is the smallest candlestick interval?", a: "The minimum candlestick interval is 5 minutes." },
    { q: "Can I get history for a specific provider?", a: "Yes. Both price snapshots and candles can be filtered by provider." },
    { q: "What data is in each candle?", a: "Each candle includes open, high, low, close, volume, and optionally the number of sales. The response also indicates which provider contributed the high and low." },
    { q: "How far back does historical data go?", a: "Data availability depends on when tracking started for each item and provider. Use the time range filters to query specific periods." },
  ],
  relatedFeatures: ["cs2-price-api", "cs2-candlestick-api", "cs2-sales-api", "cs2-market-indicators-api"],
  heroCtaUrl: "https://docs.cs2cap.com/api-reference/prices/#price-history",
};

function buildProviderContent(key: string, displayName: string): SeoPageContent {
  const isBuyOrderProvider = [
    "buff163", "buffmarket", "c5", "csfloat", "dmarket",
    "ecosteam", "marketcsgo", "steam", "waxpeer", "whitemarket", "youpin",
  ].includes(key);

  return {
    intro: `Access ${displayName} CS2 skin market data through the CS2Cap API. CS2Cap provides a unified API layer that aggregates data from ${displayName} alongside other supported marketplaces, so you can query pricing and market data without building a direct integration.`,
    purposeHeading: `${displayName.toUpperCase()} DATA VIA CS2CAP`,
    purposeText: `CS2Cap includes ${displayName} as one of its supported data sources. When you query CS2Cap endpoints, ${displayName} data is returned alongside other providers — normalized into a consistent format.`,
    dataPoints: [
      { icon: "DollarSign", label: "LISTING PRICES", description: `Lowest ask and listing quantity for items available on ${displayName}.` },
      ...(isBuyOrderProvider
        ? [{ icon: "TrendingUp", label: "BUY ORDERS", description: `Highest bid and bid count data from ${displayName} via the Buy Orders endpoint.` }]
        : []),
      { icon: "Clock", label: "HISTORICAL DATA", description: `Price snapshots and candlestick data that may include ${displayName} pricing over time.` },
      { icon: "BarChart3", label: "ANALYTICS", description: `Cross-marketplace analytics including ${displayName} in spread and volume calculations.` },
    ],
    useCases: [
      { icon: "Globe", title: "CROSS-MARKET COMPARISON", desc: `Compare ${displayName} prices against other marketplaces in a single API call.` },
      { icon: "Terminal", title: "AUTOMATED MONITORING", desc: `Track ${displayName} pricing programmatically alongside other providers.` },
      { icon: "BarChart3", title: "MARKET ANALYSIS", desc: `Include ${displayName} data in spread, volume, and pricing analysis across markets.` },
      ...(isBuyOrderProvider
        ? [{ icon: "TrendingUp", title: "BID-ASK SPREADS", desc: `Calculate ${displayName} bid-ask spreads using combined price and buy order data.` }]
        : [{ icon: "Layers", title: "PORTFOLIO TRACKING", desc: `Include ${displayName} valuations in inventory and portfolio pricing tools.` }]),
    ],
    faqs: [
      { q: `Is this an official ${displayName} API?`, a: `No. CS2Cap is a third-party aggregation service. ${displayName} data is included as one of many supported marketplace sources.` },
      { q: `What data is available from ${displayName}?`, a: `CS2Cap returns listing prices${isBuyOrderProvider ? ", buy orders," : ""} and historical data from ${displayName} through its unified endpoints. Exact field availability depends on what the marketplace provides.` },
      { q: "How do I filter for this provider only?", a: `Use the requested_providers parameter on price and bid endpoints to restrict results to ${displayName} data only.` },
    ],
    relatedFeatures: isBuyOrderProvider
      ? ["cs2-price-api", "cs2-buy-order-api", "cs2-price-history-api"]
      : ["cs2-price-api", "cs2-price-history-api", "cs2-sales-api"],
  };
}

const FREE_CS2_API_CONTENT: SeoPageContent = {
  intro:
    "Get started with the CS2 API for free. CS2Cap offers a free tier with no credit card required, giving you real-time CS2 skin prices, buy orders, sales history, and market analytics across 40+ marketplaces.",
  purposeHeading: "FREE CS2 API ACCESS",
  purposeText:
    "The CS2Cap free tier gives developers, traders, and tinkerers immediate access to live CS2 skin market data through a unified REST API. Sign up with an email, generate an API key, and start making requests — no card required up front.",
  dataPoints: [
    { icon: "DollarSign", label: "ZERO COST TO START", description: "Sign up and start querying CS2 skin prices, buy orders, and analytics on the free tier without entering payment details." },
    { icon: "Globe", label: "40+ MARKETPLACES", description: "Free tier requests return aggregated data from BUFF163, CSFloat, Skinport, Steam, DMarket, YouPin, and 40+ more marketplaces." },
    { icon: "FileJson", label: "FULL JSON API", description: "Same JSON shape as paid tiers — endpoints, schemas, and authentication are identical, so you can scale up without rewriting code." },
    { icon: "Clock", label: "REAL-TIME DATA", description: "Live lowest-ask pricing and recent sales — the same fresh data that powers paid plans, capped only by request volume." },
  ],
  useCases: [
    { icon: "Terminal", title: "PROTOTYPING", desc: "Build a CS2 trading bot, valuation tool, or dashboard against the free tier and upgrade only when you ship." },
    { icon: "Globe", title: "PRICE COMPARISON", desc: "Power a free price-comparison site or browser extension using the free CS2 API tier." },
    { icon: "BarChart3", title: "PERSONAL ANALYTICS", desc: "Track your own CS2 inventory value or watchlist without paying for an enterprise data feed." },
    { icon: "Layers", title: "RESEARCH & STUDIES", desc: "Pull historical CS2 skin pricing data for academic research, blog posts, or market reports." },
  ],
  faqs: [
    { q: "Is the CS2 API really free?", a: "Yes. The free tier gives you access to live CS2 skin prices, buy orders, and analytics with no credit card required. Sign up to see the current free-tier rate limits." },
    { q: "What's the catch?", a: "Free-tier requests are rate limited. Paid plans raise the limits and unlock high-throughput batch endpoints, but the data and endpoint surface are otherwise identical." },
    { q: "Do I need to pay later?", a: "Only if your usage exceeds the free tier. You can stay on the free tier as long as you want." },
    { q: "How do I get a free API key?", a: "Sign in with your email, generate an API key from the account dashboard, and include it as a Bearer token in your Authorization header." },
  ],
  relatedFeatures: ["cs2-price-api", "cs2-buy-order-api", "cs2-price-history-api", "cs2-item-catalog-api"],
};

const CS2_DATA_API_CONTENT: SeoPageContent = {
  intro:
    "A single CS2 data API that exposes live pricing, buy orders, sales records, historical snapshots, candlestick charts, and market analytics across 40+ CS2 skin marketplaces. Built for trading bots, dashboards, and research workflows.",
  purposeHeading: "ONE FEED FOR EVERY DATA TYPE",
  purposeText:
    "CS2Cap normalizes CS2 skin market data from every supported marketplace into a single, consistent JSON schema. Whether you need live ticker data, intraday candlesticks, or month-long historical price feeds, you query one API instead of integrating dozens of marketplaces individually.",
  dataPoints: [
    { icon: "DollarSign", label: "PRICING DATA", description: "Lowest ask, listing quantity, and live cross-market price feeds for every CS2 skin in the catalog." },
    { icon: "TrendingUp", label: "BUY ORDER DATA", description: "Highest bid and bid count from marketplaces that support buy orders, normalized to the same schema as pricing data." },
    { icon: "Clock", label: "HISTORICAL DATA", description: "Time-series price snapshots and OHLCV candles with intervals from 5 minutes for backtesting and trend analysis." },
    { icon: "BarChart3", label: "ANALYTICS DATA", description: "Cross-market spreads, liquidity scores, volume metrics, and arbitrage signals in machine-readable form." },
    { icon: "Receipt", label: "SALES DATA", description: "Recent sale records with price, float value, and paint seed where available from supported providers." },
    { icon: "FileJson", label: "CATALOG DATA", description: "Full CS2 item metadata feed: rarity, collection, wear range, image, and family relationships for every skin." },
  ],
  useCases: [
    { icon: "Terminal", title: "TRADING BOTS", desc: "Feed normalized CS2 data into automated trading systems without writing per-marketplace adapters." },
    { icon: "BarChart3", title: "DATA SCIENCE", desc: "Pull historical CS2 pricing data into pandas, R, or your warehouse of choice for modeling and reporting." },
    { icon: "Layers", title: "PIPELINES", desc: "Stream CS2 market data into your ETL pipeline via REST and webhook callbacks." },
    { icon: "Globe", title: "DASHBOARDS", desc: "Power live dashboards that show prices, spreads, volume, and indicators across the full CS2 marketplace ecosystem." },
  ],
  faqs: [
    { q: "What CS2 data does the API expose?", a: "Pricing, buy orders, sales history, OHLCV candlesticks, market analytics, and the full item catalog — all queryable through REST endpoints with the same authentication and schema conventions." },
    { q: "How fresh is the data?", a: "Live endpoints return real-time market state. Historical endpoints expose snapshots and candlesticks down to 5-minute intervals." },
    { q: "What format is the data in?", a: "JSON. Schemas are documented in the OpenAPI specification at docs.cs2cap.com." },
    { q: "Can I get bulk historical CS2 data?", a: "Yes. The price history and candlestick endpoints support pagination, time range filters, and provider filters for bulk pulls." },
  ],
  relatedFeatures: ["cs2-price-api", "cs2-buy-order-api", "cs2-price-history-api", "cs2-candlestick-api", "cs2-sales-api", "cs2-market-analytics-api"],
};

const CS2_ITEMS_API_CONTENT: SeoPageContent = {
  intro:
    "Search, list, and look up every CS2 item through the CS2Cap items API. Browse the full Counter-Strike 2 skin database with metadata, rarity, collection, wear range, and live pricing across 40+ marketplaces.",
  purposeHeading: "THE FULL CS2 ITEM DATABASE",
  purposeText:
    "CS2Cap maintains a comprehensive catalog of every CS2 item — skins, knives, gloves, agents, stickers, music kits, patches, cases, and more. The items API exposes the catalog with rich metadata so you can build search experiences, valuation tools, and inventory trackers without scraping.",
  dataPoints: [
    { icon: "FileJson", label: "ITEM METADATA", description: "Item ID, market hash name, base name, skin name, wear name, item type, weapon, collection, rarity, finish style, and phase." },
    { icon: "Filter", label: "FILTERS & SEARCH", description: "Filter by item type, weapon type, wear, rarity, collection, or free-text search query." },
    { icon: "Layers", label: "WEAR & VARIANTS", description: "Each wear and StatTrak/Souvenir variant is a distinct item with its own ID and image." },
    { icon: "Globe", label: "LINKED PRICING", description: "Every item links to live multi-marketplace pricing, buy orders, sales history, and analytics endpoints." },
  ],
  useCases: [
    { icon: "Terminal", title: "INVENTORY TOOLS", desc: "Build CS2 inventory valuation tools that look up items by hash name and price them across all supported markets." },
    { icon: "Globe", title: "SEARCH UIs", desc: "Power autocomplete and faceted search experiences for skin marketplaces or comparison sites." },
    { icon: "BarChart3", title: "FAMILY ROLLUPS", desc: "Group items by base/skin family to display every wear and variant in a single price card." },
    { icon: "Layers", title: "BOT METADATA", desc: "Use catalog metadata to filter target items by rarity, collection, or wear range in trading bots." },
  ],
  faqs: [
    { q: "How many CS2 items are in the catalog?", a: "Tens of thousands — every wear, StatTrak, Souvenir, phase, and finish style for every skin, knife, glove, sticker, agent, music kit, patch, and case." },
    { q: "What identifies an item?", a: "Each item has a numeric item_id and a market_hash_name. Both can be used to look up pricing and analytics for that specific item." },
    { q: "Can I search by name?", a: "Yes. The items endpoint accepts a free-text q parameter that performs forgiving search across the catalog." },
    { q: "Are CS:GO items included?", a: "Yes. CS:GO and CS2 share the same item catalog — there is no separate CS:GO database." },
  ],
  relatedFeatures: ["cs2-price-api", "cs2-buy-order-api", "cs2-sales-api", "cs2-item-catalog-api"],
};

const CS2_SKINS_API_CONTENT: SeoPageContent = {
  intro:
    "Live CS2 skin pricing, buy orders, sales records, and analytics for every Counter-Strike 2 skin via one REST API. CS2Cap aggregates 40+ skin marketplaces so you can query any CS2 skin with a single request.",
  purposeHeading: "EVERY CS2 SKIN, ONE API",
  purposeText:
    "From popular skins like AWP Dragon Lore and AK-47 Redline to rarity-low stickers and rare patterns, CS2Cap covers the full CS2 skin catalog with live cross-market pricing, buy orders, and historical data.",
  dataPoints: [
    { icon: "DollarSign", label: "SKIN PRICING", description: "Lowest ask and listing quantity for every CS2 skin variant — by wear, StatTrak, Souvenir, and phase." },
    { icon: "TrendingUp", label: "SKIN BUY ORDERS", description: "Highest bid and bid count for skins on every marketplace that supports buy orders." },
    { icon: "Clock", label: "SKIN PRICE HISTORY", description: "Historical snapshots and OHLCV candles for every CS2 skin going back as far as data has been tracked." },
    { icon: "FileJson", label: "SKIN METADATA", description: "Float range, rarity, collection, finish style, phase, and image URL for every skin in the catalog." },
  ],
  useCases: [
    { icon: "Globe", title: "PRICE TRACKERS", desc: "Build a tracker that shows the cheapest CS2 skin price across every marketplace in real time." },
    { icon: "Terminal", title: "TRADING BOTS", desc: "Power CS2 skin trading bots with live cross-market pricing and bid data." },
    { icon: "BarChart3", title: "SKIN ANALYTICS", desc: "Analyze CS2 skin price trends, volatility, and arbitrage spreads across marketplaces." },
    { icon: "Layers", title: "INVENTORY VALUATION", desc: "Value entire CS2 skin inventories at current market rates using the batch pricing endpoint." },
  ],
  faqs: [
    { q: "Are knives, gloves, stickers, and agents included?", a: "Yes. The CS2 skin API covers every cosmetic item type: rifles, pistols, SMGs, knives, gloves, stickers, agents, music kits, patches, and more." },
    { q: "Are CS:GO skins included?", a: "Yes. CS2 and CS:GO share the same item set, so the same skin API serves both communities." },
    { q: "How many CS2 skins are tracked?", a: "Tens of thousands of distinct skin variants — every wear, StatTrak, Souvenir, and phase combination." },
    { q: "Can I get prices for a single skin?", a: "Yes. Query by item_id or market_hash_name to retrieve live multi-marketplace pricing for any individual skin." },
  ],
  relatedFeatures: ["cs2-price-api", "cs2-buy-order-api", "cs2-price-history-api", "cs2-sales-api", "cs2-item-catalog-api"],
};

/* ---------- Page definitions ---------- */

const GENERAL_PAGES: SeoPageConfig[] = [
  {
    slug: "cs2-api",
    type: "general",
    title: "CS2 API — Free Real-Time Skin Price & Market Data",
    description:
      "Get real-time CS2 & CS:GO skin prices, buy orders, sales, and charts from one REST API covering 40+ marketplaces. Free tier, no credit card needed.",
    h1: "CS2 API",
    canonicalPath: "/cs2-api",
    includeInSitemap: true,
    content: CS2_API_CONTENT,
  },
  {
    slug: "cs2-market-api",
    type: "general",
    title: "CS2 Market API — Live Skin Market Data & Prices",
    description:
      "Pull live CS2 & CS:GO skin market data — prices, buy orders, history, and analytics from 40+ marketplaces — through one unified REST API.",
    h1: "CS2 Market API",
    canonicalPath: "/cs2-market-api",
    includeInSitemap: true,
    content: CSGO_API_CONTENT,
  },
  {
    slug: "cs2-skin-api",
    type: "general",
    title: "CS2 Skin API — Prices & Item Data for Every Skin",
    description:
      "Look up live prices, buy orders, and metadata for every CS2 & CS:GO skin via one API. Full catalog, 40+ marketplaces, free to start.",
    h1: "CS2 Skin API",
    canonicalPath: "/cs2-skin-api",
    includeInSitemap: true,
  },
  {
    slug: "free-cs2-api",
    type: "general",
    title: "Free CS2 API — Live Skin Prices, No Credit Card",
    description:
      "Start free with the CS2 API: real-time CS2 & CS:GO skin prices, buy orders, and analytics across 40+ marketplaces. No credit card required.",
    h1: "Free CS2 API",
    canonicalPath: "/free-cs2-api",
    includeInSitemap: true,
    content: FREE_CS2_API_CONTENT,
  },
  {
    slug: "cs2-data-api",
    type: "general",
    title: "CS2 Data API — Skin Pricing & Market Data Feeds",
    description:
      "Stream CS2 & CS:GO skin data — prices, buy orders, sales, candlesticks, and analytics from 40+ marketplaces — through one REST API.",
    h1: "CS2 Data API",
    canonicalPath: "/cs2-data-api",
    includeInSitemap: true,
    content: CS2_DATA_API_CONTENT,
  },
  {
    slug: "cs2-items-api",
    type: "general",
    title: "CS2 Items API — Full Skin Catalog & Item Database",
    description:
      "Search and look up every CS2 & CS:GO item via one API: rarity, wear, collection, images, and live pricing from the full catalog.",
    h1: "CS2 Items API",
    canonicalPath: "/cs2-items-api",
    includeInSitemap: true,
    content: CS2_ITEMS_API_CONTENT,
  },
  {
    slug: "cs2-skins-api",
    type: "general",
    title: "CS2 Skins API — Live Prices for Every CS2 Skin",
    description:
      "Query live prices, buy orders, sales, and analytics for every CS2 & CS:GO skin through one REST API across 40+ marketplaces.",
    h1: "CS2 Skins API",
    canonicalPath: "/cs2-skins-api",
    includeInSitemap: true,
    content: CS2_SKINS_API_CONTENT,
  },
  {
    slug: "csgo-api",
    type: "general",
    title: "CSGO API — CS:GO & CS2 Skin Prices & Market Data",
    description:
      "Free CS:GO / CS2 skin market API: live prices, buy orders, and historical data for every item across 40+ marketplaces. No credit card needed.",
    h1: "CSGO API",
    canonicalPath: "/csgo-api",
    includeInSitemap: true,
    content: CSGO_API_CONTENT,
  },
];

const FEATURE_PAGES: SeoPageConfig[] = [
  {
    slug: "cs2-price-api",
    type: "feature",
    title: "CS2 Price API — Real-Time Skin Prices, 40+ Markets",
    description:
      "Fetch live CS2 & CS:GO skin prices from 40+ marketplaces in one request — lowest ask, listing quantity, batch pricing, and provider filters.",
    h1: "CS2 Price API",
    canonicalPath: "/cs2-price-api",
    includeInSitemap: true,
    content: CS2_PRICE_API_CONTENT,
  },
  {
    slug: "cs2-buy-order-api",
    type: "feature",
    title: "CS2 Buy Order API — Live Bids & Highest Bid Data",
    description:
      "Get CS2 & CS:GO skin buy order data — highest bid and bid count — from BUFF163, CSFloat, Steam, YouPin, and more in one API call.",
    h1: "CS2 Buy Order API",
    canonicalPath: "/cs2-buy-order-api",
    includeInSitemap: true,
    content: CS2_BUY_ORDER_API_CONTENT,
  },
  {
    slug: "cs2-sales-api",
    type: "feature",
    title: "CS2 Sales API — Recent Skin Sale Records & Prices",
    description:
      "Retrieve recent CS2 & CS:GO skin sales — price, float, and paint seed — from supported marketplaces through one REST API.",
    h1: "CS2 Sales API",
    canonicalPath: "/cs2-sales-api",
    includeInSitemap: true,
    content: {
      intro:
        "Retrieve recent CS2 skin sale records including price, float, and paint seed data from supported marketplaces.",
      relatedFeatures: ["cs2-price-api", "cs2-price-history-api", "cs2-candlestick-api", "cs2-market-analytics-api"],
      heroCtaUrl: "https://docs.cs2cap.com/api-reference/sales/#list-recent-sales",
    },
  },
  {
    slug: "cs2-price-history-api",
    type: "feature",
    title: "CS2 Price History API — Historical Skin Price Data",
    description:
      "Get historical CS2 & CS:GO skin price snapshots and OHLCV candles, intervals from 5 minutes. Filter by provider, item, and time range.",
    h1: "CS2 Price History API",
    canonicalPath: "/cs2-price-history-api",
    includeInSitemap: true,
    content: CS2_PRICE_HISTORY_API_CONTENT,
  },
  {
    slug: "cs2-candlestick-api",
    type: "feature",
    title: "CS2 Candlestick API — OHLCV Skin Price Charts",
    description:
      "Build CS2 & CS:GO skin price charts with OHLCV candlestick data — open, high, low, close, volume — at intervals from 5 minutes up.",
    h1: "CS2 Candlestick API",
    canonicalPath: "/cs2-candlestick-api",
    includeInSitemap: true,
    content: {
      intro:
        "CS2 skin candlestick chart data with open, high, low, close, and volume. Multiple intervals from 5 minutes up.",
      relatedFeatures: ["cs2-price-history-api", "cs2-price-api", "cs2-market-indicators-api", "cs2-market-analytics-api"],
      heroCtaUrl: "https://docs.cs2cap.com/api-reference/prices/#price-candles",
    },
  },
  {
    slug: "cs2-market-analytics-api",
    type: "feature",
    title: "CS2 Market Analytics API — Cross-Market Insights",
    description:
      "Analyze CS2 & CS:GO skin markets with spreads, liquidity scores, and cross-marketplace comparisons through one unified REST API.",
    h1: "CS2 Market Analytics API",
    canonicalPath: "/cs2-market-analytics-api",
    includeInSitemap: true,
    content: {
      intro:
        "CS2 market analytics including spreads, liquidity scores, and cross-marketplace comparisons through a unified API.",
      relatedFeatures: ["cs2-market-arbitrage-api", "cs2-market-indicators-api", "cs2-price-api", "cs2-buy-order-api"],
      heroCtaUrl: "https://docs.cs2cap.com/api-reference/market-analytics/#get-item-analytics",
    },
  },
  {
    slug: "cs2-market-arbitrage-api",
    type: "feature",
    title: "CS2 Arbitrage API — Cross-Market Skin Price Gaps",
    description:
      "Spot CS2 & CS:GO skin price discrepancies across 40+ marketplaces and surface live arbitrage opportunities through one REST API.",
    h1: "CS2 Market Arbitrage API",
    canonicalPath: "/cs2-market-arbitrage-api",
    includeInSitemap: true,
    content: {
      intro:
        "Detect CS2 skin price discrepancies across marketplaces. Identify arbitrage opportunities with real-time cross-market data.",
      relatedFeatures: ["cs2-market-analytics-api", "cs2-price-api", "cs2-buy-order-api", "cs2-market-indicators-api"],
      heroCtaUrl: "https://docs.cs2cap.com/api-reference/market-analytics/#get-arbitrage-opportunities",
    },
  },
  {
    slug: "cs2-market-indicators-api",
    type: "feature",
    title: "CS2 Market Indicators API — Technical Signals",
    description:
      "Get technical market indicators for CS2 & CS:GO skins — price trends, volume analysis, and trading signals — via one REST API.",
    h1: "CS2 Market Indicators API",
    canonicalPath: "/cs2-market-indicators-api",
    includeInSitemap: true,
    content: {
      intro:
        "Technical market indicators for CS2 skins including price trends, volume analysis, and market signals.",
      relatedFeatures: ["cs2-market-analytics-api", "cs2-candlestick-api", "cs2-price-history-api", "cs2-market-arbitrage-api"],
      heroCtaUrl: "https://docs.cs2cap.com/api-reference/market-analytics/#get-technical-indicators",
    },
  },
  {
    slug: "cs2-item-catalog-api",
    type: "feature",
    title: "CS2 Item Catalog API — Full Skin Database & Search",
    description:
      "Browse the full CS2 & CS:GO item catalog via one API — metadata, rarity, collections, wear ranges, and forgiving text search.",
    h1: "CS2 Item Catalog API",
    canonicalPath: "/cs2-item-catalog-api",
    includeInSitemap: true,
    content: {
      intro:
        "Complete CS2 item catalog API with metadata, rarity, collections, wear ranges, and search. Browse the full skin database.",
      relatedFeatures: ["cs2-price-api", "cs2-buy-order-api", "cs2-sales-api", "cs2-market-analytics-api"],
      heroCtaUrl: "https://docs.cs2cap.com/api-reference/catalog/#list-items",
    },
  },
];

const PRIORITY_PROVIDER_SLUGS = [
  "youpin", "buff163", "c5",
  "csfloat", "csmoney_t", "csmoney_m", "dmarket", "lisskins",
  "marketcsgo", "skinport", "steam", "whitemarket",
];

function buildMarketPages(): SeoPageConfig[] {
  return Object.entries(PROVIDER_DISPLAY_NAMES).map(([key, displayName]) => {
    const isPriority = PRIORITY_PROVIDER_SLUGS.includes(key);
    return {
      slug: `${key}-api`,
      type: "market" as const,
      title: `${displayName} API — CS2 & CS:GO Skin Market Data`,
      description: `Access ${displayName} CS2 & CS:GO skin prices, buy orders, and price history through the CS2Cap API — one integration for ${displayName} and 40 more marketplaces.`,
      h1: `${displayName} API`,
      canonicalPath: `/${key}-api`,
      includeInSitemap: true,
      ...(isPriority ? { content: buildProviderContent(key, displayName) } : {}),
    };
  });
}

export const SEO_PAGES: SeoPageConfig[] = [
  ...GENERAL_PAGES,
  ...FEATURE_PAGES,
  ...buildMarketPages(),
];

export function getPageBySlug(slug: string): SeoPageConfig | undefined {
  return SEO_PAGES.find((p) => p.slug === slug);
}

export function getPagesByType(type: SeoPageType): SeoPageConfig[] {
  return SEO_PAGES.filter((p) => p.type === type);
}

const SITE_URL = "https://cs2cap.com";

export function buildPageMetadata(slug: string): Metadata {
  const page = getPageBySlug(slug);
  if (!page) {
    return {};
  }

  const url = `${SITE_URL}${page.canonicalPath}`;
  const ogImage = `${SITE_URL}/api/og?slug=${page.slug}`;

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.canonicalPath },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      siteName: "CS2Cap",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: page.h1,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [ogImage],
    },
  };
}
