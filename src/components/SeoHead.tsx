import { useEffect } from "react";
import { formatNumber, formatSignedPercent, type RecordView } from "../data/metrics";
import type { LedgerDataset } from "../data/schema";
import { copy, type Language } from "../i18n/language";
import type { AppRoute } from "../routes/hashRouter";

type SeoHeadProps = {
  dataset: LedgerDataset;
  records: RecordView[];
  activeRecord: RecordView | null;
  route: AppRoute;
  language: Language;
};

const siteUrl = "https://gotra.me/";
const defaultTitle = "GOTRA Public Ledger | AI股票研究公开预测账本";
const defaultDescription =
  "GOTRA Public Ledger 是可审计的 AI股票研究公开预测账本，展示 public-safe demo 数据、错误复盘与研究边界。";
const ogImageUrl = `${siteUrl}og-image.svg`;

type RouteSeo = {
  title: string;
  description: string;
  url: string;
  type: "website" | "article";
};

function directionLabel(direction: RecordView["direction"]): string {
  if (direction === "up") {
    return "看涨";
  }
  if (direction === "down") {
    return "看跌";
  }
  return "中性";
}

function recordDescription(record: RecordView): string {
  const actual = record.actual_change_pct === null ? "暂无" : formatSignedPercent(record.actual_change_pct);
  const error = record.error === null ? "误差暂无" : `${formatNumber(Math.abs(record.error))}pp`;
  return `${record.ticker} ${record.company} 的可审计公开预测记录：${record.decision_date} ${directionLabel(
    record.direction,
  )}，预测 ${formatSignedPercent(record.expected_change_pct)}，实际 ${actual}，${error}。研究信息，非投资建议。`;
}

function canonicalRoutePath(route: AppRoute): string {
  if (route.name === "home") {
    return "/";
  }
  if (route.name === "prediction") {
    return `/predictions/${encodeURIComponent(route.predictionId)}`;
  }
  if (route.name === "note") {
    return `/notes/${encodeURIComponent(route.slug)}`;
  }
  return route.path;
}

function routeSeo(route: AppRoute, language: Language, record: RecordView | null): RouteSeo {
  if (record) {
    const title = `${record.ticker} ${record.company} | GOTRA 可审计预测记录`;
    return {
      title,
      description: recordDescription(record),
      url: `${siteUrl}predictions/${encodeURIComponent(record.prediction_id)}`,
      type: "article",
    };
  }

  const routes: Record<string, { zhTitle: string; enTitle: string; zhDescription: string; enDescription: string }> = {
    "/": {
      zhTitle: "GOTRA Public Ledger | 生产日报、Demo 账本与公开研究边界",
      enTitle: "GOTRA Public Ledger | Production Reports, Demo Ledger, and Research Boundaries",
      zhDescription:
        "GOTRA Public Ledger 展示最新生产日报、Full Analyst 金丝雀、冻结 Demo 账本和透明度文章。研究信息，不是投资建议、交易信号、业绩证明或科学/公开证明。",
      enDescription:
        "GOTRA Public Ledger separates production daily reports, the Full Analyst Canary, a frozen demo ledger, and transparency articles. Research information only; not investment advice, not a trading signal, not performance proof, and not science/public proof.",
    },
    "/today": {
      zhTitle: "GOTRA 今日研究简报 | GOTRA Public Ledger",
      enTitle: "GOTRA Daily Research Brief | GOTRA Public Ledger",
      zhDescription:
        "每日公开安全研究简报，汇总 Full Analyst 研究摘要、agent 分析矩阵、red-team、风险因素、内部 Alaya 回读、数据缺口和下一步观察。不是投资建议或交易信号。",
      enDescription:
        "A public-safe daily reader brief with Full Analyst research summaries, the agent analysis matrix, red-team review, risk factors, internal Alaya readback, data gaps, and next watch points. Not investment advice or a trading signal.",
    },
    "/reports": {
      zhTitle: "生产日报审计 | GOTRA Public Ledger",
      enTitle: "Production Daily Reports Audit | GOTRA Public Ledger",
      zhDescription:
        "生产日报页面展示港股早报、港股晚报、美股早报、美股晚报、全局汇总和 Full Analyst 金丝雀公开安全产物。不是投资建议、交易信号、业绩证明或科学/公开证明。",
      enDescription:
        "Production Daily Reports show HK morning, HK evening, US morning, US evening, global summary, and Full Analyst Canary public-safe artifacts. Not investment advice, not a trading signal, not performance proof, and not science/public proof.",
    },
    "/notes": {
      zhTitle: "透明度文章 | GOTRA Public Ledger",
      enTitle: "Transparency Articles | GOTRA Public Ledger",
      zhDescription:
        "透明度文章是静态文章归档，不是最新生产日报。最新生产运行请看生产日报。研究信息，不是投资建议或交易信号。",
      enDescription:
        "Transparency Articles are a static archive, not the latest production daily reports. Use Production Daily Reports for live runtime status. Research information only; not advice or trading signals.",
    },
    "/ledger": {
      zhTitle: "冻结 Demo 账本 | GOTRA Public Ledger",
      enTitle: "Frozen Demo Ledger | GOTRA Public Ledger",
      zhDescription:
        "冻结 Demo 账本是 snapshot_date=2026-06-20 的公开安全演示快照，不是最新生产日报、实时预测账本、业绩证明或交易信号。",
      enDescription:
        "Frozen Demo Ledger is a public-safe demo snapshot dated 2026-06-20. It is not the latest production report, not a live prediction ledger, not performance proof, and not a trading signal.",
    },
    "/performance": {
      zhTitle: "表现说明 | GOTRA Public Ledger",
      enTitle: "Performance Notes | GOTRA Public Ledger",
      zhDescription:
        "表现说明明确暂无生产表现跟踪。paper portfolio 是未来日期 demo fixture，不是当前生产、实盘交易、业绩证明、收益承诺、交易信号或投资建议。",
      enDescription:
        "Performance Notes state that no production performance tracking is available. The paper portfolio is a future-dated demo fixture, not current production, live trading, performance proof, return promise, trading signal, or investment advice.",
    },
    "/sources": {
      zhTitle: "来源与产物 | GOTRA Public Ledger",
      enTitle: "Sources and Artifacts | GOTRA Public Ledger",
      zhDescription:
        "来源与产物页面区分生产公开产物与静态 demo/archive artifact，不公开私有 GOTRA 原始产物、提示词、供应商原始输出或 secrets。",
      enDescription:
        "Sources and Artifacts separates live production artifacts from static demo/archive artifacts and does not publish private GOTRA raw artifacts, prompts, provider raw output, or secrets.",
    },
    "/system": {
      zhTitle: "系统说明 | GOTRA Public Ledger",
      enTitle: "System Overview | GOTRA Public Ledger",
      zhDescription:
        "系统说明描述研究认知系统的设计草案、证据门、边界门和失败条件。它不是交易机器、科学证明、业绩证明或上线毕业声明。",
      enDescription:
        "System Overview describes the research cognition system draft, evidence gates, boundary gates, and failure conditions. It is not a trading machine, science proof, performance proof, or launch graduation claim.",
    },
    "/methodology": {
      zhTitle: "方法论 | GOTRA Public Ledger",
      enTitle: "Methodology | GOTRA Public Ledger",
      zhDescription:
        "方法论说明股票池、结算器、假设组合和数据边界如何先固定规则再解释结果。研究信息，不是投资建议、交易信号或业绩证明。",
      enDescription:
        "Methodology explains how universe, resolver, paper portfolio, and data boundaries are fixed before interpretation. Research information only; not investment advice, trading signals, or performance proof.",
    },
  };

  const path = canonicalRoutePath(route);
  const page = routes[path] ?? routes["/"];
  return {
    title: copy(language, page.zhTitle, page.enTitle),
    description: copy(language, page.zhDescription, page.enDescription),
    url: `${siteUrl}${path === "/" ? "" : path.replace(/^\//, "")}`,
    type: route.name === "note" ? "article" : "website",
  };
}

function findQueryRecord(records: RecordView[]): RecordView | null {
  const predictionId = new URLSearchParams(window.location.search).get("prediction_id");
  return predictionId ? records.find((record) => record.prediction_id === predictionId) ?? null : null;
}

function ensureMeta(selector: string, create: () => HTMLMetaElement): HTMLMetaElement {
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (existing) {
    return existing;
  }
  const meta = create();
  document.head.appendChild(meta);
  return meta;
}

function setNamedMeta(name: string, content: string) {
  const meta = ensureMeta(`meta[name="${name}"]`, () => {
    const element = document.createElement("meta");
    element.setAttribute("name", name);
    return element;
  });
  meta.setAttribute("content", content);
}

function setPropertyMeta(property: string, content: string) {
  const meta = ensureMeta(`meta[property="${property}"]`, () => {
    const element = document.createElement("meta");
    element.setAttribute("property", property);
    return element;
  });
  meta.setAttribute("content", content);
}

function setCanonical(url: string) {
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", url);
}

function setJsonLd(dataset: LedgerDataset, records: RecordView[], seo: RouteSeo) {
  let script = document.head.querySelector<HTMLScriptElement>("#gotra-json-ld");
  if (!script) {
    script = document.createElement("script");
    script.id = "gotra-json-ld";
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: "GOTRA Public Ledger",
        url: siteUrl,
        description: "Research information only. Not investment advice.",
      },
      {
        "@type": "Dataset",
        "@id": `${siteUrl}#dataset`,
        name: "GOTRA Public Ledger public-safe demo dataset",
        description: defaultDescription,
        url: siteUrl,
        dateModified: dataset.metadata.snapshot_date,
        license: `${siteUrl}docs/DATA_BOUNDARY.md`,
        measurementTechnique: "public-safe demo ledger snapshot; not OOS validation",
        variableMeasured: ["prediction_id", "ticker", "decision_date", "expected_change_pct", "actual_change_pct", "error"],
        includedInDataCatalog: {
          "@type": "DataCatalog",
          name: "GOTRA Public Ledger",
        },
        creator: {
          "@id": `${siteUrl}#organization`,
        },
        keywords: ["AI股票研究", "公开预测账本", "可审计", "public-safe demo"],
        temporalCoverage: dataset.metadata.snapshot_date,
        size: records.length,
      },
      {
        "@type": "WebPage",
        "@id": seo.url,
        name: seo.title,
        url: seo.url,
        description: seo.description,
        isPartOf: {
          "@type": "WebSite",
          name: "GOTRA Public Ledger",
          url: siteUrl,
        },
      },
    ],
  });
}

export function SeoHead({ dataset, records, activeRecord, route, language }: SeoHeadProps) {
  useEffect(() => {
    const record = activeRecord ?? findQueryRecord(records);
    const seo = routeSeo(route, language, record);

    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = seo.title || defaultTitle;
    setNamedMeta("description", seo.description || defaultDescription);
    setNamedMeta("keywords", "AI股票研究, 公开预测账本, 可审计, research information only, not investment advice");
    setNamedMeta("twitter:card", "summary_large_image");
    setNamedMeta("twitter:url", seo.url);
    setNamedMeta("twitter:title", seo.title);
    setNamedMeta("twitter:description", seo.description);
    setNamedMeta("twitter:image", ogImageUrl);
    setPropertyMeta("og:type", seo.type);
    setPropertyMeta("og:site_name", "GOTRA Public Ledger");
    setPropertyMeta("og:title", seo.title);
    setPropertyMeta("og:description", seo.description);
    setPropertyMeta("og:image", ogImageUrl);
    setPropertyMeta("og:url", seo.url);
    setCanonical(seo.url);
    setJsonLd(dataset, records, seo);
  }, [activeRecord, dataset, language, records, route]);

  return null;
}
