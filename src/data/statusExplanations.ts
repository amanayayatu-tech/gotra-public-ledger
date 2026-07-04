import type { Language } from "../i18n/language";

export type StatusExplanation = {
  raw: string;
  title: string;
  explanation: string;
  evidenceLayer: string;
  proves: string;
  doesNotProve: string[];
  nextAction: string;
};

type StatusCopy = {
  zhTitle: string;
  enTitle: string;
  zhExplanation: string;
  enExplanation: string;
  evidenceLayer: string;
  zhProves: string;
  enProves: string;
  zhNextAction: string;
  enNextAction: string;
};

const commonDoesNotProveZh = ["不是 10 小时正式验收", "不是投资建议", "不是交易信号", "不是业绩证明", "不是科学/公开有效性证明"];
const commonDoesNotProveEn = ["Not 10h/formal acceptance", "Not investment advice", "Not a trading signal", "Not performance proof", "Not science/public proof"];

const STATUS_COPY: Record<string, StatusCopy> = {
  PASS_V40_FRONTEND_PRODUCTIZATION_SMOKE: {
    zhTitle: "前端产品化生产冒烟测试通过",
    enTitle: "Frontend productization smoke passed",
    zhExplanation: "生产页面、导航、研究阅读器、中文说明、审计入口和 raw artifact 边界通过浏览器抽样检查。",
    enExplanation: "Production pages, navigation, research reader, Chinese explanations, audit entry, and raw artifact boundaries passed sampled browser checks.",
    evidenceLayer: "production smoke",
    zhProves: "证明本次前端阅读路径在生产环境可打开、可读、可审计。",
    enProves: "Shows this frontend reading path is reachable, readable, and auditable in production.",
    zhNextAction: "如要正式验收，需要单独启动长跑/正式验收。",
    enNextAction: "Run a separate long-run/formal acceptance if that claim is needed.",
  },
  PASS_WITH_REVIEW_ITEMS_2H_V40_KSANA_COGNITION_FLYWHEEL: {
    zhTitle: "两小时 v4 压力测试通过，但保留复核项",
    enTitle: "2h v4 pressure passed with review items",
    zhExplanation: "工程链路和公开产物在两小时窗口内稳定，但仍保留研究复核项。",
    enExplanation: "The engineering chain and public artifacts were stable in the 2h window, with research review items preserved.",
    evidenceLayer: "2h pressure",
    zhProves: "证明该测试窗口内 v4 链路稳定运行。",
    enProves: "Shows the v4 chain stayed stable within that test window.",
    zhNextAction: "继续改进复核项；不要升级成 10 小时正式验收。",
    enNextAction: "Continue improving review items; do not upgrade this to 10h formal acceptance.",
  },
  PASS_WITH_REVIEW_ITEMS: {
    zhTitle: "通过但保留复核项",
    enTitle: "Pass with review items",
    zhExplanation: "检查或链路已通过，但仍有研究质量、证据缺口或复核事项需要保留。",
    enExplanation: "The check or chain passed, but research-quality, evidence-gap, or review items remain visible.",
    evidenceLayer: "smoke evidence",
    zhProves: "证明当前检查没有工程阻断。",
    enProves: "Shows the current check has no engineering blocker.",
    zhNextAction: "继续阅读复核原因和下一步观察项。",
    enNextAction: "Read the review reasons and next-watch items.",
  },
  PASS: {
    zhTitle: "通过",
    enTitle: "Pass",
    zhExplanation: "当前检查项通过。仍需结合证据层级理解它能证明什么。",
    enExplanation: "The current check passed. Interpret it together with the evidence layer.",
    evidenceLayer: "local checks or smoke evidence",
    zhProves: "证明该检查项本身通过。",
    enProves: "Shows this specific check passed.",
    zhNextAction: "核对对应的证据层级和原始审计材料。",
    enNextAction: "Check the corresponding evidence layer and audit material.",
  },
  NEEDS_REVIEW: {
    zhTitle: "需要复核",
    enTitle: "Needs review",
    zhExplanation: "这不是自动失败，而是研究或证据质量控制：薄弱假设、冲突来源或证据不足需要继续审查。",
    enExplanation: "This is not automatic failure; it is research or evidence quality control for weak assumptions, source conflicts, or insufficient evidence.",
    evidenceLayer: "research quality",
    zhProves: "证明系统没有把不充分结论包装成确定答案。",
    enProves: "Shows the system did not package insufficient evidence as certainty.",
    zhNextAction: "查看红队反证、研究质量闸门和缺失来源。",
    enNextAction: "Review Red Team critique, quality gate, and missing sources.",
  },
  BLOCKED: {
    zhTitle: "已阻断",
    enTitle: "Blocked",
    zhExplanation: "存在工程或数据层面的阻断项，不能把当前结果当作完成。",
    enExplanation: "An engineering or data blocker exists; the current result cannot be treated as complete.",
    evidenceLayer: "blocked",
    zhProves: "证明当前流程需要先解除阻断。",
    enProves: "Shows the blocker must be resolved first.",
    zhNextAction: "先定位 blocker，再修复和重跑对应 gate。",
    enNextAction: "Diagnose the blocker, fix it, and rerun the relevant gate.",
  },
  needs_review: {
    zhTitle: "需要复核",
    enTitle: "Needs review",
    zhExplanation: "研究质量控制状态：证据、假设或来源冲突需要继续核对。",
    enExplanation: "Research quality-control state: evidence, assumptions, or source conflicts need review.",
    evidenceLayer: "research quality",
    zhProves: "证明不确定性被保留在明面上。",
    enProves: "Shows uncertainty is kept visible.",
    zhNextAction: "查看对应复核理由。",
    enNextAction: "Read the corresponding review reason.",
  },
  data_gap: {
    zhTitle: "数据缺口",
    enTitle: "Data gap",
    zhExplanation: "公开数据或来源覆盖不足。系统不会用私有数据或旧数据补成结论。",
    enExplanation: "Public data or source coverage is incomplete. The system does not fill the gap with private or stale data.",
    evidenceLayer: "research boundary",
    zhProves: "证明缺口被显式保留。",
    enProves: "Shows the gap is explicitly preserved.",
    zhNextAction: "把它当作下一轮需要补证据的研究项。",
    enNextAction: "Treat it as evidence to fill in the next research cycle.",
  },
  completed_with_review_items: {
    zhTitle: "已完成但保留复核项",
    enTitle: "Completed with review items",
    zhExplanation: "本次公开产物已写出，但仍有研究复核项，不应被读成纯通过。",
    enExplanation: "The public artifact was produced, but research review items remain; do not read it as a pure pass.",
    evidenceLayer: "production artifact",
    zhProves: "证明产物已生成且保留复核边界。",
    enProves: "Shows the artifact exists and keeps review boundaries visible.",
    zhNextAction: "继续查看复核项和观察条件。",
    enNextAction: "Continue to review items and watch conditions.",
  },
  pass_with_review_items: {
    zhTitle: "通过但保留复核项",
    enTitle: "Pass with review items",
    zhExplanation: "链路通过，但仍保留研究复核项或边界限制。",
    enExplanation: "The chain passed while research review items or boundary limits remain.",
    evidenceLayer: "smoke evidence",
    zhProves: "证明没有当前工程阻断。",
    enProves: "Shows there is no current engineering blocker.",
    zhNextAction: "继续查看复核项，不要升级为正式验收。",
    enNextAction: "Read the review items; do not upgrade this to formal acceptance.",
  },
  publish_with_boundary: {
    zhTitle: "带边界发布",
    enTitle: "Publish with boundary",
    zhExplanation: "研究内容可以公开，但必须带上研究边界，避免被读成投资建议或交易信号。",
    enExplanation: "Research content can be public only with reader boundaries that prevent advice or signal framing.",
    evidenceLayer: "reader boundary",
    zhProves: "证明公开表达保留了边界。",
    enProves: "Shows public wording keeps the boundary.",
    zhNextAction: "阅读边界说明和证据层级。",
    enNextAction: "Read the boundary note and evidence layer.",
  },
  verified: {
    zhTitle: "已验证",
    enTitle: "Verified",
    zhExplanation: "对应回读或检查项已经完成验证。",
    enExplanation: "The corresponding readback or check has been verified.",
    evidenceLayer: "local or smoke check",
    zhProves: "证明该检查点通过。",
    enProves: "Shows this checkpoint passed.",
    zhNextAction: "继续核对它属于哪个证据层级。",
    enNextAction: "Confirm the evidence layer it belongs to.",
  },
  ok: {
    zhTitle: "正常",
    enTitle: "OK",
    zhExplanation: "当前检查项正常。它只代表该检查项，不代表正式验收。",
    enExplanation: "The current check is OK. It only covers this check, not formal acceptance.",
    evidenceLayer: "local or smoke check",
    zhProves: "证明该检查项没有报错。",
    enProves: "Shows this check did not fail.",
    zhNextAction: "结合上下文继续阅读。",
    enNextAction: "Continue reading with the surrounding context.",
  },
  degraded: {
    zhTitle: "降级",
    enTitle: "Degraded",
    zhExplanation: "部分状态不健康或证据不足，需要复核具体原因。",
    enExplanation: "Some state is unhealthy or evidence is insufficient; inspect the reason.",
    evidenceLayer: "runtime status",
    zhProves: "证明当前状态不能被直接读成健康。",
    enProves: "Shows the current state cannot be read as healthy.",
    zhNextAction: "查看监控、状态文件和复核原因。",
    enNextAction: "Check monitor, status files, and review reasons.",
  },
  unavailable: {
    zhTitle: "不可用",
    enTitle: "Unavailable",
    zhExplanation: "公开产物或状态暂不可用；页面不会从私有或 raw 产物推断内容。",
    enExplanation: "The public artifact or status is unavailable; the page does not infer from private or raw artifacts.",
    evidenceLayer: "artifact availability",
    zhProves: "证明当前公开状态缺失。",
    enProves: "Shows the public status is missing.",
    zhNextAction: "等待产物或查看审计中心。",
    enNextAction: "Wait for the artifact or inspect the Audit Center.",
  },
};

export function explainStatus(rawStatus: string | null | undefined, language: Language): StatusExplanation {
  const raw = rawStatus?.trim() || "unavailable";
  const key = STATUS_COPY[raw] ? raw : STATUS_COPY[raw.toLowerCase()] ? raw.toLowerCase() : raw;
  const entry = STATUS_COPY[key] ?? {
    zhTitle: raw.replaceAll("_", " "),
    enTitle: raw.replaceAll("_", " "),
    zhExplanation: "这是公开状态码。请结合证据层级阅读，不要把它自动升级为正式验收。",
    enExplanation: "This is a public status code. Read it with its evidence layer; do not automatically upgrade it to formal acceptance.",
    evidenceLayer: "status code",
    zhProves: "只证明该状态码被公开报告。",
    enProves: "Only shows this status code was publicly reported.",
    zhNextAction: "展开审计元数据查看原始状态码。",
    enNextAction: "Open audit metadata to inspect the raw code.",
  };
  return {
    raw,
    title: language === "zh" ? entry.zhTitle : entry.enTitle,
    explanation: language === "zh" ? entry.zhExplanation : entry.enExplanation,
    evidenceLayer: entry.evidenceLayer,
    proves: language === "zh" ? entry.zhProves : entry.enProves,
    doesNotProve: language === "zh" ? commonDoesNotProveZh : commonDoesNotProveEn,
    nextAction: language === "zh" ? entry.zhNextAction : entry.enNextAction,
  };
}
