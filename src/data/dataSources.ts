import type { Language } from "../i18n/language";

export type DataSourcePolicy = {
  id: string;
  name: string;
  sourceType: {
    zh: string;
    en: string;
  };
  markets: string[];
  purpose: {
    zh: string;
    en: string;
  };
  limits: {
    zh: string;
    en: string;
  };
  commercialBoundary: {
    zh: string;
    en: string;
  };
};

export const dataSourcePolicies: DataSourcePolicy[] = [
  {
    id: "yahoo_chart_api_via_gotra_price_cache",
    name: "Yahoo Finance chart API via GOTRA price_cache helper",
    sourceType: { zh: "价格数据", en: "price data" },
    markets: ["HKEX", "NASDAQ", "NYSE"],
    purpose: {
      zh: "日线 adjusted close 的研究 / 原型证据。",
      en: "Research/prototype evidence for daily adjusted close rows.",
    },
    limits: {
      zh: "低频批处理、本地缓存、只使用已完成日线；不能声称为生产级实时行情授权。",
      en: "Low-frequency batch use with local cache and completed daily bars only; not a licensed realtime market-data feed.",
    },
    commercialBoundary: {
      zh: "不能作为未来商业发布的唯一行情来源。",
      en: "Cannot be the sole market-data source for future commercial release.",
    },
  },
  {
    id: "stooq",
    name: "Stooq public daily prices",
    sourceType: { zh: "备用价格数据", en: "backup price data" },
    markets: ["NASDAQ", "NYSE", "selected global"],
    purpose: {
      zh: "公开历史价格的低频备用研究来源。",
      en: "Low-frequency backup research source for public historical prices.",
    },
    limits: {
      zh: "覆盖、代码映射和时效可能不完整；必须缓存并记录缺口。",
      en: "Coverage, symbol mapping, and freshness may be incomplete; cache and record gaps.",
    },
    commercialBoundary: {
      zh: "不是生产级实时行情授权。",
      en: "Not production realtime market-data authorization.",
    },
  },
  {
    id: "alpha_vantage",
    name: "Alpha Vantage free tier",
    sourceType: { zh: "低频备用价格 / 指标", en: "low-frequency fallback price/indicator" },
    markets: ["NASDAQ", "NYSE", "selected global"],
    purpose: {
      zh: "显式配置后作为低频备用来源。",
      en: "Fallback source only when explicitly configured.",
    },
    limits: {
      zh: "免费层按低频使用：不超过 5 requests/minute 和 500 requests/day。",
      en: "Free tier only: no more than 5 requests/minute and 500 requests/day.",
    },
    commercialBoundary: {
      zh: "任何商业发布用途都需要单独授权复核。",
      en: "Commercial release use requires separate permission review.",
    },
  },
  {
    id: "sec_edgar",
    name: "SEC EDGAR filings and CompanyFacts",
    sourceType: { zh: "监管披露 / 公司事实", en: "regulatory filings / company facts" },
    markets: ["NASDAQ", "NYSE", "US issuers"],
    purpose: {
      zh: "美国发行人 filings、CompanyFacts 和公告时间戳证据。",
      en: "US issuer filings, CompanyFacts, and publication timestamp evidence.",
    },
    limits: {
      zh: "请求必须带合规 User-Agent，最高 10 requests/second，并使用缓存与退避。",
      en: "Requests require a compliant User-Agent, capped at 10 requests/second, with cache and backoff.",
    },
    commercialBoundary: {
      zh: "可用于公开披露事实核对；不是价格行情源。",
      en: "Useful for public filing facts; not a price feed.",
    },
  },
  {
    id: "fred",
    name: "FRED macroeconomic data",
    sourceType: { zh: "宏观数据", en: "macro data" },
    markets: ["US", "global macro"],
    purpose: {
      zh: "宏观背景和系列发布日期证据。",
      en: "Macroeconomic context and series release-date evidence.",
    },
    limits: {
      zh: "宏观序列有发布日历和修订风险。",
      en: "Macro series have release calendars and revision risk.",
    },
    commercialBoundary: {
      zh: "只能作为宏观证据，不能独立支持个股价格结论。",
      en: "Macro context only; cannot independently support stock-specific price conclusions.",
    },
  },
  {
    id: "hkexnews",
    name: "HKEXnews issuer announcements",
    sourceType: { zh: "港交所公告 / 披露事实", en: "HKEX announcements / disclosure facts" },
    markets: ["HKEX"],
    purpose: {
      zh: "港股发行人公告、披露事实和发布时间核对。",
      en: "HK issuer announcements, disclosure facts, and publication-time checks.",
    },
    limits: {
      zh: "低频查询和缓存；公告发布时间可能滞后交易时段。",
      en: "Low-frequency lookup with cache; announcement timing may lag trading sessions.",
    },
    commercialBoundary: {
      zh: "不是免费实时行情来源。",
      en: "Not a free realtime quote source.",
    },
  },
];

export function dataSourceText(
  language: Language,
  text: DataSourcePolicy["purpose"] | DataSourcePolicy["limits"] | DataSourcePolicy["commercialBoundary"] | DataSourcePolicy["sourceType"],
): string {
  return language === "zh" ? text.zh : text.en;
}
