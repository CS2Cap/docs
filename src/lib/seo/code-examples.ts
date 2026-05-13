/**
 * Hero code examples for feature SEO landing pages.
 *
 * Each example mirrors the corresponding endpoint in openapi.json (response examples
 * taken from the spec where available; the sales and items examples are constructed
 * from the schema since the spec does not include literal examples for them).
 */

export interface SeoCodeExample {
  method: "GET" | "POST";
  path: string;
  /** Pretty-printed JSON shown beneath the curl line. */
  response: string;
}

const FEATURE_EXAMPLES: Record<string, SeoCodeExample> = {
  "cs2-price-api": {
    method: "GET",
    path: "/v1/prices?item_id=156&limit=1",
    response: `{
  "meta": {
    "currency": "USD",
    "returned_providers": ["csfloat"]
  },
  "items": [
    {
      "provider": "csfloat",
      "item_id": 156,
      "market_hash_name": "AK-47 | Redline (Field-Tested)",
      "lowest_ask": 2490,
      "quantity": 96
    }
  ]
}`,
  },
  "cs2-buy-order-api": {
    method: "GET",
    path: "/v1/bids?item_id=32&limit=2",
    response: `{
  "meta": {
    "currency": "USD",
    "providers_queried": ["buff163", "csfloat"]
  },
  "items": [
    {
      "provider": "csfloat",
      "item_id": 32,
      "market_hash_name": "★ Gut Knife | Doppler (Factory New)",
      "highest_bid": 2550,
      "num_bids": 5
    },
    {
      "provider": "buff163",
      "item_id": 32,
      "highest_bid": 2480,
      "num_bids": 12
    }
  ]
}`,
  },
  "cs2-sales-api": {
    method: "GET",
    path: "/v1/sales?item_id=156&limit=2",
    response: `{
  "meta": {
    "currency": "USD",
    "providers_queried": ["csfloat", "skinport"]
  },
  "items": [
    {
      "provider": "csfloat",
      "item_id": 156,
      "market_hash_name": "AK-47 | Redline (Field-Tested)",
      "price": 2516,
      "float_value": 0.1842,
      "paint_seed": 387,
      "sold_at": "2026-01-20T11:58:42Z"
    },
    {
      "provider": "skinport",
      "item_id": 156,
      "price": 2490,
      "sold_at": "2026-01-20T11:55:11Z"
    }
  ]
}`,
  },
  "cs2-price-history-api": {
    method: "GET",
    path: "/v1/prices/history?item_id=156&limit=2",
    response: `{
  "meta": {
    "currency": "USD",
    "result_count": 2
  },
  "items": [
    {
      "time": "2026-01-20T12:00:00Z",
      "item_id": 156,
      "provider": "Steam Community Market",
      "price": 2550,
      "quantity": 142
    },
    {
      "time": "2026-01-20T11:55:00Z",
      "item_id": 156,
      "provider": "Skinport",
      "price": 2490,
      "quantity": 37
    }
  ]
}`,
  },
  "cs2-candlestick-api": {
    method: "GET",
    path: "/v1/prices/candles?item_id=156&interval=1h&limit=2",
    response: `{
  "meta": {
    "item_id": 156,
    "interval": "1h",
    "currency": "USD"
  },
  "data": [
    {
      "t": 1768906800,
      "o": 2508, "h": 2535, "l": 2460, "c": 2516,
      "v": 24,   "q": 179,
      "providers": { "h": "steam", "l": "csfloat" }
    },
    {
      "t": 1768910400,
      "o": 2522, "h": 2560, "l": 2490, "c": 2544,
      "v": 18,   "q": 176
    }
  ]
}`,
  },
  "cs2-market-analytics-api": {
    method: "GET",
    path: "/v1/market/items/12632",
    response: `{
  "meta": { "data_source": "live", "freshness_sec": 0 },
  "data": {
    "item_id": 12632,
    "market_hash_name": "AK-47 | Redline (Field-Tested)",
    "summary": {
      "provider_count": 3,
      "best_ask_usd": "24.90",
      "best_bid_usd": "24.90",
      "avg_spread_pct": 2.35,
      "total_volume_24h": 107,
      "liquidity": 78,
      "price_rate_24h": 3.75
    }
  }
}`,
  },
  "cs2-market-arbitrage-api": {
    method: "GET",
    path: "/v1/market/arbitrage?providers_buy=c5&providers_sell=csfloat&min_spread_pct=8",
    response: `{
  "meta": { "data_source": "live", "freshness_sec": 16 },
  "data": {
    "items": [
      {
        "market_hash_name": "AK-47 | X-Ray (Factory New)",
        "buy_provider": "c5",
        "buy_price_usd": "3167.91",
        "sell_provider": "csfloat",
        "sell_price_usd": "3602.50",
        "gross_spread_pct": 13.72,
        "net_profit_usd": "398.56",
      }
    ]
  }
}`,
  },
  "cs2-market-indicators-api": {
    method: "GET",
    path: "/v1/market/indicators?item_id=8474&interval=1d",
    response: `{
  "meta": { "interval": "1d", "data_source": "live" },
  "data": {
    "item_id": 156,
    "close_price_usd": "25.50",
    "momentum": {
      "rsi_14": 62.5,
      "macd_line": 0.45,
      "sma_20": 25.3,
      "sma_50": 24.8
    },
    "volatility": { "atr_14": 1.25 },
    "signals": {
      "rsi": "neutral",
      "macd": "bullish",
      "trend": "bullish",
      "composite_score": 0.55
    }
  }
}`,
  },
  "cs2-item-catalog-api": {
    method: "GET",
    path: "/v1/items?limit=1",
    response: `{
  "items": [
    {
      "item_id": 156,
      "market_hash_name": "AK-47 | Redline (Field-Tested)",
      "weapon_type": "Rifle",
      "skin_name": "Redline",
      "wear_name": "Field-Tested",
      "rarity_name": "Classified",
      "min_float": 0.10,
      "max_float": 0.70,
      "is_stattrak": false
    }
  ],
  "pagination": { "limit": 1, "offset": 0, "total": 32623 }
}`,
  },
};

export function getSeoCodeExample(slug: string): SeoCodeExample | undefined {
  return FEATURE_EXAMPLES[slug];
}
