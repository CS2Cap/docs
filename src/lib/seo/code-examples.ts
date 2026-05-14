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
    path: "/v1/prices?market_hash_name=\"Karambit | Gamma Doppler\"&phase=Phase 3",
    response: `{
  "meta": {
    "currency": "USD",
    "filters": {
      "market_hash_name": "★ Karambit | Gamma Doppler (Factory New)",
      "phase": "Phase 3"
  },
  "items": [
    {
      "provider": "buff163",
      "market_hash_name": "★ Karambit | Gamma Doppler (Factory New)",
      "phase": "Phase 3",
      "lowest_ask": 163387,
      "quantity": 808,
      "url": "https://buff.163.com/goods/43011?from=market#tag_ids=447197",
      "last_updated": "2026-05-14T04:23:24.604764Z"
    },
    {
      "provider": "youpin",
      "market_hash_name": "★ Karambit | Gamma Doppler (Factory New)",
      "phase": "Phase 3",
      "lowest_ask": 161346,
      "quantity": 851,
      "url": "https://youpin898.com/market/goods-list?templateId=43529",
      "last_updated": "2026-05-14T04:21:52.563935Z"
    }
  ],
  "pagination": {
    "limit": 1000,
    "offset": 0,
    "total": 28,
  }
}`,
  },
  "cs2-buy-order-api": {
    method: "GET",
    path: "/v1/bids?providers=youpin&currency=USD",
    response: `{
  "meta": {
    "currency": "USD",
    "filters": {
    "requested_providers": ["youpin"]
    }
  },
  "items": [
    {
      "market_hash_name": "AK-47 | Bloodsport (Well-Worn)",
      "highest_bid": 12924,
      "num_bids": 9,
      "last_updated": "2026-05-14T04:21:52.563935Z"
    },
    {
      "market_hash_name": "AK-47 | Blue Laminate (Factory New)",
      "highest_bid": 5394,
      "num_bids": 73,
      "last_updated": "2026-05-14T04:21:52.563935Z"
    },
  ],
  "pagination": {
    "limit": 1000,
    "total": 26665,
    "has_next": true
  }
}`,
  },
  "cs2-sales-api": {
    method: "GET",
    path: "/v1/sales?market_hash_name=\"M4A1-S | Blue Phosphor\"&providers=csfloat",
    response: `{
  "meta": {
    "currency": "USD",
    "filters": {
      "market_hash_name": "M4A1-S | Blue Phosphor (Factory New)",
      "requested_providers": ["csfloat"]
    },
    "result_count": 50
  },
  "items": [
    {
      "date": "2026-05-13T08:47:25.172301Z",
      "price": 75211,
      "float": 0.007452671881765127,
      "paint_seed": 121,
      "stickers": [
        {"name": "Sticker | FalleN | Austin 2025", "slot": 0, "wear": 1.0}
      ],
      "charms": [
        {"name": "Charm | Lil' Tusk", "pattern_id": 20257}
      ],
      "inspect": {"in_game": "steam://rungame/730/76561202255233023/+csgo_econ_action_preview"}
    }
  ]
}`,
  },
  "cs2-price-history-api": {
    method: "GET",
    path: "/v1/prices/history?market_hash_name=\"AWP | Asiimov\"",
    response: `{
  "meta": {
    "currency": "USD",
    "filters": {
      "market_hash_name": "AWP | Asiimov (Field-Tested)",
      "start": "2026-04-09T07:15:45.331530Z",
      "end": null
    },
    "result_count": 1000
  },
  "items": [
    {
      "item_id": 15065,
      "market_hash_name": "AWP | Asiimov (Field-Tested)",
      "provider": "Youpin898",
      "time": "2026-05-14T05:00:00Z",
      "price": 11605,
      "quantity": 2354
    },
    {
      "item_id": 15065,
      "market_hash_name": "AWP | Asiimov (Field-Tested)",
      "provider": "WAXPEER",
      "time": "2026-05-14T05:00:00Z",
      "price": 12335,
      "quantity": 36
    }
  ]
}`,
  },
  "cs2-candlestick-api": {
    method: "GET",
    path: "/v1/prices/candles?market_hash_name=\"M4A4 | The Coalition\"&interval=1h",
    response: `{
  "meta": {
    "market_hash_name": "M4A4 | The Coalition (Factory New)",
    "currency": "USD",
    "interval": "1h"
  },
  "data": [
    {
      "t": 1776902400,
      "o": 165565,
      "h": 224301,
      "l": 165565,
      "c": 166466,
      "v": 0,
      "q": 769,
      "providers": {"o": "skinscom", "h": "skinsmonkey", "l": "skinscom", "c": "youpin"}
    },
    ...
    {
      "t": 1778734800,
      "o": 166496,
      "h": 283841,
      "l": 166488,
      "c": 166488,
      "v": 10,
      "q": 870,
      "providers": {"o": "youpin", "h": "csdeals", "l": "youpin", "c": "youpin"}
    }
  ]
}`,
  },
  "cs2-market-analytics-api": {
    method: "GET",
    path: "/v1/market/items",
    response: `{
  "items": [
    {
      "item_id": 9933,
      "market_hash_name": "★ Butterfly Knife | Fade (Factory New)",
      "phase": null,
      "summary": {
        "provider_count": 28,
        "best_ask_usd": "2155.00",
        "best_bid_usd": "2235.86",
        "avg_spread_pct": 15.16,
        "total_volume_24h": 971,
        "liquidity": 90,
        "supply": 13799,
        "rank": 3,
        "marketcap": "29736845.00",
        "price_rate_24h": -2.4,
        "price_diff_24h": "-53.00",
        "price_rate_7d": -7.88,
        "price_diff_7d": "-184.73",
        "price_rate_30d": -11.64,
        "price_diff_30d": "-300.65",
        "sales_1d": 971,
        "sales_7d": 5620,
        "sales_30d": 15640,
        "steam_sales_7d": 0,
        "steam_sales_30d": 2,
        "liquidity_last_updated": "2026-05-14T06:54:30.793493Z"
      }
    }
  ]
}`,
  },
  "cs2-market-arbitrage-api": {
    method: "GET",
    path: "/v1/market/arbitrage?min_spread_pct=8",
    response: `{
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
}`,
  },
  "cs2-market-indicators-api": {
    method: "GET",
    path: "/v1/market/indicators?item_id=8474&interval=1d",
    response: `{
  "data": {
    "item_id": 12632,
    "market_hash_name": "AK-47 | Redline (Field-Tested)",
    "close_price_usd": "28.0",
    "momentum": {
      "rsi_14": 36.17, 
      "macd_histogram": 0.1,
      "sma_200": 41.22, 
      "ema_26": 31.66, 
      "bb_upper": 31.9
    },
    "volatility": {
      "atr_14": 22.85,
      "kc_middle": 30.74.
      "historical_volatility_20": 0.0238
    },
    "volume": { 
      "vwap": 45.6, 
      "obv": -29622.0, 
      "volume_sma_20": 6944.8
    },
    "signals": {
      "rsi": "neutral",
      "macd": "bullish",
      "trend": "bearish",
      "bollinger": "breakout_down",
      "volatility": "low"    
    }
  }
}`,
  },
  "cs2-item-catalog-api": {
    method: "GET",
    path: "/v1/items?base_name=\"Butterfly Knife\"&skin_name=\"Doppler\"&phase=\"Ruby\"",
    response: `{
  "items": [
    {
      "item_id": 17436,
      "market_hash_name": "★ Butterfly Knife | Doppler (Factory New)",
      "phase": "Ruby",
      "item_type": "Weapon",
      "item_subtype": "Knives",
      "weapon_type": "Knife",
      "base_name": "Butterfly Knife",
      "skin_name": "Doppler",
      "wear_name": "Factory New",
      "def_index": "515",
      "paint_index": 415,
      "collection": null,
      "crates": ["Spectrum 2 Case", "Spectrum Case"],
      "rarity_name": "Covert",
      "rarity_color": "eb4b4b",
      "style_name": "Anodized Multicolored",
      "is_stattrak": false,
      "is_souvenir": false,
      "min_float": 0.0,
      "max_float": 0.08,
      "image_url": "https://cdn.cs2c.app/images/...._png.png",
      "supply": 405
    }
  ]
}`,
  },
};

export function getSeoCodeExample(slug: string): SeoCodeExample | undefined {
  return FEATURE_EXAMPLES[slug];
}
