import { useEffect } from "react";
import { formatNumber, formatSignedPercent, type RecordView } from "../data/metrics";
import type { LedgerDataset } from "../data/schema";

type SeoHeadProps = {
  dataset: LedgerDataset;
  records: RecordView[];
  activeRecord: RecordView | null;
};

const siteUrl = "https://amanayayatu-tech.github.io/gotra-public-ledger/";
const defaultTitle = "GOTRA Public Ledger | AI股票研究公开预测账本";
const defaultDescription =
  "GOTRA Public Ledger 是可审计的 AI股票研究公开预测账本，展示 public-safe demo 数据、错误复盘与研究边界。";
const ogImageUrl = `${siteUrl}og-image.svg`;

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

function setJsonLd(dataset: LedgerDataset, records: RecordView[]) {
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
    ],
  });
}

export function SeoHead({ dataset, records, activeRecord }: SeoHeadProps) {
  useEffect(() => {
    const record = activeRecord ?? findQueryRecord(records);
    const title = record ? `${record.ticker} ${record.company} | GOTRA 可审计预测记录` : defaultTitle;
    const description = record ? recordDescription(record) : defaultDescription;
    const url = record ? `${siteUrl}?prediction_id=${encodeURIComponent(record.prediction_id)}` : siteUrl;

    document.title = title;
    setNamedMeta("description", description);
    setNamedMeta("keywords", "AI股票研究, 公开预测账本, 可审计, research information only, not investment advice");
    setNamedMeta("twitter:card", "summary_large_image");
    setNamedMeta("twitter:title", title);
    setNamedMeta("twitter:description", description);
    setNamedMeta("twitter:image", ogImageUrl);
    setPropertyMeta("og:type", record ? "article" : "website");
    setPropertyMeta("og:site_name", "GOTRA Public Ledger");
    setPropertyMeta("og:title", title);
    setPropertyMeta("og:description", description);
    setPropertyMeta("og:image", ogImageUrl);
    setPropertyMeta("og:url", url);
    setCanonical(url);
    setJsonLd(dataset, records);
  }, [activeRecord, dataset, records]);

  return null;
}
