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
    title: { zh: "v4 Full Analyst 研究阅读器", en: "v4 Full Analyst reader" },
    body: {
      zh: "再用产品化 reader 核对每个标的的 Research Task、Evidence Packet、K dossier、F/W/G、Chairman、Red Team、Knowledge Gate 和 unresolved questions；Markdown 原文只在审计折叠区打开。",
      en: "Then use the product reader to inspect per-symbol Research Task, Evidence Packet, K dossier, F/W/G, Chairman, Red Team, Knowledge Gate, and unresolved questions; the Markdown original opens only inside the audit disclosure.",
    },
  },
  {
    id: "reports",
    href: "/#/reports",
    route: "/reports",
    title: { zh: "审计中心 / 公开产物", en: "Audit Center / Public Artifacts" },
    body: {
      zh: "核对覆盖日报、Full Analyst v4、状态 JSON、监控产物、raw artifact 折叠区和证据层级。",
      en: "Audit coverage reports, Full Analyst v4, status JSON, monitor artifacts, raw artifact disclosures, and evidence layers.",
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
    id: "methodology",
    href: "/#/methodology",
    route: "/methodology",
    title: { zh: "方法论", en: "Methodology" },
    body: {
      zh: "最后读规则：Research Quality Gate、Knowledge Gate、Reader Boundary、数据边界、fallback 版本和为什么 raw artifact 只能在审计区打开。",
      en: "Read the rules last: Research Quality Gate, Knowledge Gate, Reader Boundary, data boundaries, fallback versions, and why raw artifacts only open in audit areas.",
    },
  },
];

export const guideSystemFlow: GuideFlowStep[] = [
  {
    id: "research-task",
    title: { zh: "Research Task Planner", en: "Research Task Planner" },
    body: {
      zh: "先说明为什么今天研究这只股票、核心问题、必须验证的来源，以及哪些证据缺失时不能下结论。",
      en: "Starts with why this stock is studied today, the core questions, required sources, and what cannot be concluded if evidence is missing.",
    },
  },
  {
    id: "evidence-packet",
    title: { zh: "Evidence Packet Builder", en: "Evidence Packet Builder" },
    body: {
      zh: "把公开来源、source type、freshness、missing required sources、stale sources 和 data_gap 放进可审计证据包。",
      en: "Builds an auditable packet with public sources, source type, freshness, missing required sources, stale sources, and data_gap.",
    },
  },
  {
    id: "k-dossier",
    title: { zh: "K Deep Research Dossier", en: "K Deep Research Dossier" },
    body: {
      zh: "K 不是普通并行 agent；它先产出 deep research dossier，后续 F/W/G 必须基于 K、任务书和证据包。",
      en: "K is not an ordinary parallel agent; it creates the deep research dossier before F/W/G run from K, the task, and the evidence packet.",
    },
  },
  {
    id: "perspectives",
    title: { zh: "F/W/G 并行视角", en: "F/W/G parallel perspectives" },
    body: {
      zh: "F/W/G 在 K dossier 后并行运行，保留不同视角、冲突、证据强弱和不确定性。",
      en: "F/W/G run in parallel after the K dossier and preserve different views, conflicts, evidence strength, and uncertainty.",
    },
  },
  {
    id: "chairman-red-team",
    title: { zh: "Chairman + Red Team", en: "Chairman + Red Team" },
    body: {
      zh: "Chairman 综合 K/F/W/G 的共识、冲突和权重；Red Team 做反证、漏洞和 over-certainty 审计，但不是 Judge。",
      en: "Chairman synthesizes K/F/W/G consensus, conflicts, and weighting; Red Team audits counter-evidence, weaknesses, and over-certainty, but is not the Judge.",
    },
  },
  {
    id: "quality-knowledge-gates",
    title: { zh: "Research Quality Gate + Knowledge Gate", en: "Research Quality Gate + Knowledge Gate" },
    body: {
      zh: "Quality Gate 给出 candidate/watch/needs_review/data_gap 等研究状态；Knowledge Gate 决定 persist、limited persist、temporary observation 或 do_not_persist。",
      en: "Quality Gate sets candidate/watch/needs_review/data_gap style research status; Knowledge Gate decides persist, limited persist, temporary observation, or do_not_persist.",
    },
  },
  {
    id: "internal-alaya",
    title: { zh: "内部 Alaya readback", en: "Internal Alaya readback" },
    body: {
      zh: "Alaya 只指 GOTRA repo 内部 cognition flywheel、knowledge memory、feedback state 和 hash-chain/readback，不是外部服务或独立 repo。",
      en: "Alaya only means GOTRA repo internal cognition flywheel, knowledge memory, feedback state, and hash-chain/readback, not an external service or separate repo.",
    },
  },
  {
    id: "reader-boundary",
    title: { zh: "Reader Boundary + Public Brief", en: "Reader Boundary + Public Brief" },
    body: {
      zh: "Reader Boundary Gate 不隐藏研究内容，只确保公开表达不会被误读为投资动作提示、业绩结论或科学/公开层面的验证结论。",
      en: "Reader Boundary Gate does not hide research content; it ensures public wording is not mistaken for advice, signals, performance proof, or science/public proof.",
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
