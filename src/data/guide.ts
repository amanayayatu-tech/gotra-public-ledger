import { termList } from "./glossary";

export type BilingualText = {
  zh: string;
  en: string;
};

export type GuideReadingStep = {
  id: string;
  href: string;
  route: string;
  title: BilingualText;
  body: BilingualText;
};

export type GuideFlowStep = {
  id: string;
  title: BilingualText;
  body: BilingualText;
};

export type GuideGlossaryTerm = {
  term: string;
  label: BilingualText;
  definition: BilingualText;
};

export type GuideReportType = {
  id: string;
  href: string;
  label: BilingualText;
  body: BilingualText;
};

export const guideReadingOrder: GuideReadingStep[] = [
  {
    id: "today",
    href: "/#/today",
    route: "/today",
    title: { zh: "今日简报", en: "Daily Research Brief" },
    body: {
      zh: "每天先读这里：读者化摘要、Full Analyst 摘要、数据缺口、观察清单和下一步观察都在同一页。",
      en: "Start here every day: the reader summary, Full Analyst summary, data gaps, watchlist, and next watch are on one page.",
    },
  },
  {
    id: "why-gotra",
    href: "/#/why-gotra",
    route: "/why-gotra",
    title: { zh: "为什么是 GOTRA", en: "Why GOTRA" },
    body: {
      zh: "理解 GOTRA 为什么把 data_gap、needs_review、red-team 和内部 Alaya 回读做成研究纪律，而不是把不确定性包装成结论。",
      en: "Understand why GOTRA treats data_gap, needs_review, red-team review, and internal Alaya readback as research discipline instead of hiding uncertainty inside conclusions.",
    },
  },
  {
    id: "full-analyst",
    href: "/#/reports/full-analyst",
    route: "/reports/full-analyst",
    title: { zh: "Full Analyst 研究阅读器", en: "Full Analyst reader" },
    body: {
      zh: "再用产品化 reader 核对每个标的的 agent 分析、反方审查、风险因素和观察项；Markdown 原文只在审计折叠区打开。",
      en: "Then use the product reader to inspect per-symbol agent analysis, red-team review, risk factors, and watch items; the Markdown original opens only inside the audit disclosure.",
    },
  },
  {
    id: "reports",
    href: "/#/reports",
    route: "/reports",
    title: { zh: "报告归档 / 生产日报审计", en: "Report Archive / Production Daily Reports Audit" },
    body: {
      zh: "核对五个日报、覆盖率、异常清单、Full Analyst 先行试跑、状态 JSON 和公开产物链接。",
      en: "Audit the five daily reports, coverage, exceptions, Full Analyst Canary, status JSON, and public artifact links.",
    },
  },
  {
    id: "sources",
    href: "/#/sources",
    route: "/sources",
    title: { zh: "来源与产物", en: "Sources and Artifacts" },
    body: {
      zh: "看哪些文件是生产公开产物，哪些只是静态 demo/archive/fixture；这里不公开私有 GOTRA 原始产物。",
      en: "See which files are live production artifacts and which are static demo/archive/fixture materials; private GOTRA raw artifacts are not published.",
    },
  },
  {
    id: "ledger",
    href: "/#/ledger",
    route: "/ledger",
    title: { zh: "Demo 账本", en: "Demo Ledger" },
    body: {
      zh: "只把它当冻结 public-safe 演示快照；不是最新生产日报、实时预测账本或交易指令。",
      en: "Treat this only as a frozen public-safe demo snapshot; it is not the latest production daily report, live prediction ledger, or trading instruction.",
    },
  },
  {
    id: "performance",
    href: "/#/performance",
    route: "/performance",
    title: { zh: "表现说明", en: "Performance Notes" },
    body: {
      zh: "确认当前没有生产表现证明；paper portfolio 是未来日期 demo fixture，不能解读成收益或业绩。",
      en: "Confirm that there is no production performance proof; the paper portfolio is a future-dated demo fixture, not returns or performance.",
    },
  },
  {
    id: "methodology",
    href: "/#/methodology",
    route: "/methodology",
    title: { zh: "方法论", en: "Methodology" },
    body: {
      zh: "最后读规则：股票池、结算器、数据边界、resolved-only 口径和为什么不能后验补数据。",
      en: "Read the rules last: universe, resolver, data boundaries, resolved-only measurement, and why backfills are not fabricated.",
    },
  },
];

export const guideSystemFlow: GuideFlowStep[] = [
  {
    id: "universe",
    title: { zh: "股票池与标的身份", en: "Universe and ticker identity" },
    body: {
      zh: "每日流程先固定公开股票池和交易所身份，避免 ADR、主上市地或代码歧义导致研究错资产。",
      en: "The daily flow fixes the public universe and exchange identity first so ADRs, primary listings, or ambiguous symbols do not point to the wrong asset.",
    },
  },
  {
    id: "daily-timer",
    title: { zh: "生产日报定时器", en: "Production daily timers" },
    body: {
      zh: "五个日报定时器产出行情覆盖日报、状态 JSON、异常清单和 latest.md 别名；它们是运行/状态证据。",
      en: "The five daily timers produce coverage reports, status JSON, exception lists, and latest.md aliases; they are runtime/status evidence.",
    },
  },
  {
    id: "full-analyst",
    title: { zh: "Full Analyst 先行试跑", en: "Full Analyst candidate/canary" },
    body: {
      zh: "Full Analyst 是先行试跑 / candidate：它补充 per-symbol agent 分析、反方审查、风险因素和观察项，但不自动升级为正式结论。",
      en: "Full Analyst is a candidate/canary: it adds per-symbol agent analysis, red-team review, risk factors, and watch items, but it does not auto-upgrade conclusions.",
    },
  },
  {
    id: "judge-gate",
    title: { zh: "Judge gate", en: "Judge gate" },
    body: {
      zh: "发布前必须通过结构、覆盖、数据缺口和边界检查；需要复核或阻断的标的必须保留状态。",
      en: "Before publication, structure, coverage, data gaps, and boundaries are checked; needs-review or blocked symbols must keep their status.",
    },
  },
  {
    id: "public-safety-scan",
    title: { zh: "Public safety scan", en: "Public safety scan" },
    body: {
      zh: "公开页面只能暴露 public-safe 摘要和产物链接；不能泄露 raw prompt、provider/model I/O、secrets、数据库或私有日志。",
      en: "Public pages expose only public-safe summaries and artifact links; raw prompts, provider/model I/O, secrets, databases, and private logs are not published.",
    },
  },
  {
    id: "internal-alaya",
    title: { zh: "GOTRA 内部 Alaya 认知飞轮", en: "GOTRA internal Alaya cognition flywheel" },
    body: {
      zh: "这里的 Alaya 只指 GOTRA repo 内部的 cognition flywheel、knowledge memory、feedback state 和 hash-chain/readback 状态，不是外部服务或独立 repo。",
      en: "Alaya here only means GOTRA repo internal cognition flywheel, knowledge memory, feedback state, and hash-chain/readback state, not an external service or separate repo.",
    },
  },
  {
    id: "public-artifacts",
    title: { zh: "公开产物", en: "Public artifacts" },
    body: {
      zh: "最终公开产物包括今日简报、日报 Markdown、状态 JSON、Full Analyst 报告、来源页和 no-JS 原始 HTML。",
      en: "Public artifacts include Today's Brief, daily Markdown, status JSON, Full Analyst reports, the sources page, and no-JS raw HTML pages.",
    },
  },
  {
    id: "evidence-boundary",
    title: { zh: "证据边界", en: "Evidence boundary" },
    body: {
      zh: "local checks、browser smoke、public artifact smoke 和正式验收是不同层级；任何一层都不能被说成投资建议、交易信号、科学证明或业绩证明。",
      en: "Local checks, browser smoke, public artifact smoke, and formal acceptance are separate layers; none of them become investment advice, trading signals, science proof, or performance proof.",
    },
  },
];

export const guideGlossary: GuideGlossaryTerm[] = termList.map((item) => ({
  term: item.term,
  label: item.label,
  definition: item.explanation,
}));

export const guideReportTypes: GuideReportType[] = [
  {
    id: "daily-reader-brief",
    href: "/#/today",
    label: { zh: "今日简报 reader / Daily Brief reader", en: "Daily Brief reader / 今日简报 reader" },
    body: {
      zh: "`daily_reader_brief.json` 是数据源；默认阅读入口是 `#/today`，raw JSON 只在审计区打开。",
      en: "`daily_reader_brief.json` is the data source; the default reading entry is `#/today`, and raw JSON opens only in audit areas.",
    },
  },
  {
    id: "coverage-daily",
    href: "/reports/latest/",
    label: { zh: "行情覆盖日报 reader / Coverage report reader", en: "Coverage report reader / 行情覆盖日报 reader" },
    body: {
      zh: "`/reports/latest/` 是默认 reader；`latest.md` 是审计折叠区中的 Markdown 原文。",
      en: "`/reports/latest/` is the default reader; `latest.md` is the Markdown original inside the audit disclosure.",
    },
  },
  {
    id: "full-analyst",
    href: "/#/reports/full-analyst",
    label: { zh: "Full Analyst 研究阅读器 / Full Analyst reader", en: "Full Analyst reader / Full Analyst 研究阅读器" },
    body: {
      zh: "先行试跑候选研究的产品化阅读层；Markdown 原文只作为审计 raw artifact 保留。",
      en: "The productized reading layer for canary candidate research; the Markdown original remains only as an audit raw artifact.",
    },
  },
  {
    id: "canary-monitor",
    href: "/#/reports",
    label: { zh: "先行试跑监控审计 / Canary Monitor audit", en: "Canary Monitor audit / 先行试跑监控审计" },
    body: {
      zh: "Full Analyst 心跳、新鲜度、公开扫描和回滚状态在审计中心查看；raw JSON 只在折叠区打开。",
      en: "Full Analyst heartbeat, freshness, public scan, and rollback status live in the audit center; raw JSON opens only in disclosures.",
    },
  },
  {
    id: "status-json",
    href: "/#/reports",
    label: { zh: "状态审计 / Status audit", en: "Status audit / 状态审计" },
    body: {
      zh: "生产日报审计字段在审计中心产品化展示；raw status.json 只在 Raw artifact 折叠区打开。",
      en: "Production audit fields are productized in the audit center; raw status.json opens only in the Raw artifact disclosure.",
    },
  },
];
