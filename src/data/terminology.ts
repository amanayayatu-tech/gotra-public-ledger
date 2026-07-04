import type { Language } from "../i18n/language";

export type TerminologyKey =
  | "gotra_v4"
  | "ksana_cognition_flywheel"
  | "research_task"
  | "evidence_packet"
  | "k_dossier"
  | "perspective_agents"
  | "chairman_synthesis"
  | "red_team_critique"
  | "research_quality_gate"
  | "knowledge_gate"
  | "alaya_internal_readback"
  | "reader_boundary_gate"
  | "watch_conditions"
  | "unresolved_questions"
  | "data_gap"
  | "needs_review"
  | "pass_with_review_items"
  | "completed_with_review_items"
  | "public_safety_scan"
  | "raw_artifact"
  | "audit_metadata"
  | "full_analyst";

type TerminologyEntry = {
  zh: string;
  en: string;
  explanationZh: string;
  explanationEn: string;
};

export const terminology: Record<TerminologyKey, TerminologyEntry> = {
  gotra_v4: {
    zh: "GOTRA v4 研究认知系统",
    en: "GOTRA v4",
    explanationZh: "用研究任务、证据包、K 底稿、独立视角、综合、反证和知识回读来组织公开研究过程。",
    explanationEn: "A public research system organized around task, evidence, K dossier, independent perspectives, synthesis, critique, and memory readback.",
  },
  ksana_cognition_flywheel: {
    zh: "Ksana 认知飞轮",
    en: "Ksana cognition flywheel",
    explanationZh: "把每日研究、复核、知识沉淀和下一轮问题串起来的内部研究纪律。",
    explanationEn: "The internal research discipline linking daily research, review, knowledge persistence, and the next questions.",
  },
  research_task: {
    zh: "研究任务书",
    en: "Research Task",
    explanationZh: "先说明为什么今天研究、核心问题、必需证据，以及缺什么就不能得出结论。",
    explanationEn: "Defines why the stock is studied today, core questions, required evidence, and what cannot be concluded without it.",
  },
  evidence_packet: {
    zh: "证据包",
    en: "Evidence Packet",
    explanationZh: "把公开来源、时效、缺失来源和数据缺口放在研究输出之前。",
    explanationEn: "Places public sources, freshness, missing sources, and data gaps before research output.",
  },
  k_dossier: {
    zh: "K 深度研究底稿",
    en: "K Deep Research Dossier",
    explanationZh: "K 先产出深度研究底稿，F/W/G 后续视角必须基于它继续审查。",
    explanationEn: "K produces the deep research dossier first; F/W/G must use it for later review.",
  },
  perspective_agents: {
    zh: "F/W/G 独立视角",
    en: "F/W/G Independent Perspectives",
    explanationZh: "三个视角在 K 底稿后并行输出，保留分歧、证据强弱和不确定性。",
    explanationEn: "Three views run in parallel after K and preserve disagreement, evidence strength, and uncertainty.",
  },
  chairman_synthesis: {
    zh: "主席综合",
    en: "Chairman Synthesis",
    explanationZh: "综合 K 与 F/W/G 的共识、冲突、权重和不确定性，不只是摘要。",
    explanationEn: "Synthesizes K plus F/W/G consensus, conflicts, weight, and uncertainty; not just a summary.",
  },
  red_team_critique: {
    zh: "红队反证审计",
    en: "Red Team Critique",
    explanationZh: "专门找薄弱假设、缺失反证和过度确定风险。它不是最终裁判。",
    explanationEn: "Searches for weak assumptions, missing counter-evidence, and over-certainty risk. It is not the final judge.",
  },
  research_quality_gate: {
    zh: "研究质量闸门",
    en: "Research Quality Gate",
    explanationZh: "判断研究质量状态，例如需要复核、数据缺口或高不确定性。",
    explanationEn: "Sets research quality status such as needs review, data gap, or high uncertainty.",
  },
  knowledge_gate: {
    zh: "知识闸门",
    en: "Knowledge Gate",
    explanationZh: "决定哪些知识沉淀、哪些只作临时观察、哪些问题留到下一轮。",
    explanationEn: "Decides what persists, what remains temporary, and which questions carry forward.",
  },
  alaya_internal_readback: {
    zh: "内部 Alaya 回读",
    en: "Alaya Internal Readback",
    explanationZh: "这里只指 GOTRA repo 内部 cognition flywheel / knowledge memory / feedback / readback state，不是外部项目。",
    explanationEn: "Here it only means GOTRA repo internal cognition flywheel / knowledge memory / feedback / readback state, not an external project.",
  },
  reader_boundary_gate: {
    zh: "读者边界闸门",
    en: "Reader Boundary Gate",
    explanationZh: "不隐藏研究内容，只确保公开表达不会被读成投资建议或交易信号。",
    explanationEn: "Does not hide research content; ensures public wording is not read as advice or a signal.",
  },
  watch_conditions: {
    zh: "观察条件",
    en: "Watch Conditions",
    explanationZh: "下一次应核对的公开事件、来源状态或条件。",
    explanationEn: "Public events, source states, or conditions to check next.",
  },
  unresolved_questions: {
    zh: "未解决问题",
    en: "Unresolved Questions",
    explanationZh: "本轮证据仍不足以回答的问题，会进入下一轮研究。",
    explanationEn: "Questions this round cannot answer yet and should carry into the next research cycle.",
  },
  data_gap: {
    zh: "数据缺口",
    en: "Data Gap",
    explanationZh: "公开数据或来源覆盖不完整。系统会保留缺口，不硬编结论。",
    explanationEn: "Incomplete public data or source coverage. The system keeps the gap visible instead of inventing a conclusion.",
  },
  needs_review: {
    zh: "需要复核",
    en: "Needs Review",
    explanationZh: "研究质量控制状态，表示薄弱假设、冲突来源或证据不足需要继续审查。",
    explanationEn: "A research quality-control state for weak assumptions, conflicting sources, or insufficient evidence.",
  },
  pass_with_review_items: {
    zh: "通过但保留复核项",
    en: "Pass With Review Items",
    explanationZh: "工程链路或检查通过，但研究复核项仍需保留，不等于正式验收。",
    explanationEn: "The engineering path or check passed while review items remain; not formal acceptance.",
  },
  completed_with_review_items: {
    zh: "已完成但保留复核项",
    en: "Completed With Review Items",
    explanationZh: "本次公开产物已写出，但仍有研究复核项，不应被读成纯通过。",
    explanationEn: "The public artifact was produced, but research review items remain; it should not be read as a pure pass.",
  },
  public_safety_scan: {
    zh: "公开安全扫描",
    en: "Public Safety Scan",
    explanationZh: "检查公开产物是否避开 secrets、raw provider I/O 和不合适的公开声明。",
    explanationEn: "Checks public artifacts for secrets, raw provider I/O, and unsafe public claims.",
  },
  raw_artifact: {
    zh: "原始审计产物",
    en: "Raw Artifact",
    explanationZh: "供审计核对的 JSON 或 Markdown 原文，不是普通阅读入口。",
    explanationEn: "Raw JSON or Markdown for audit review, not the normal reading entry.",
  },
  audit_metadata: {
    zh: "审计元数据",
    en: "Audit Metadata",
    explanationZh: "run_id、hash、timing、schema 等工程字段，只应在审计折叠区查看。",
    explanationEn: "Engineering fields such as run_id, hashes, timings, and schema; shown in audit disclosures.",
  },
  full_analyst: {
    zh: "完整研究链路",
    en: "Full Analyst",
    explanationZh: "把单票研究任务、证据、K 底稿、独立视角、综合和红队审计组织成阅读层。",
    explanationEn: "The reader layer for per-symbol task, evidence, K dossier, independent views, synthesis, and Red Team critique.",
  },
};

export function termLabel(key: TerminologyKey, language: Language): string {
  const entry = terminology[key];
  return language === "zh" ? `${entry.zh}（${entry.en}）` : entry.en;
}

export function termTitle(key: TerminologyKey, language: Language): string {
  const entry = terminology[key];
  return language === "zh" ? entry.zh : entry.en;
}

export function termExplanation(key: TerminologyKey, language: Language): string {
  const entry = terminology[key];
  return language === "zh" ? entry.explanationZh : entry.explanationEn;
}

export function researchStatusLabel(status: string | null | undefined, language: Language): string {
  const value = status ?? "unavailable";
  const labels: Record<string, { zh: string; en: string }> = {
    candidate: { zh: "候选研究", en: "Candidate" },
    watch: { zh: "观察中", en: "Watch" },
    avoid: { zh: "暂不采信", en: "Avoid" },
    needs_review: { zh: "需要复核", en: "Needs review" },
    data_gap: { zh: "数据缺口", en: "Data gap" },
    high_uncertainty: { zh: "高不确定性", en: "High uncertainty" },
    pass_with_review_items: { zh: "通过但保留复核项", en: "Pass with review items" },
    completed_with_review_items: { zh: "已完成但保留复核项", en: "Completed with review items" },
    publish_with_boundary: { zh: "带边界发布", en: "Publish with boundary" },
    verified: { zh: "已验证", en: "Verified" },
    ok: { zh: "正常", en: "OK" },
    unavailable: { zh: "不可用", en: "Unavailable" },
  };
  const label = labels[value];
  if (label) {
    return language === "zh" ? label.zh : label.en;
  }
  return language === "zh" ? value.replaceAll("_", " ") : value.replaceAll("_", " ");
}

export function executionModelExplanation(model: string | null | undefined, language: Language): string {
  if (model === "deep_research_dossier_then_parallel_perspectives") {
    return language === "zh"
      ? "执行模型：先生成 K 深度研究底稿，再让 F/W/G 基于 K 并行审查。"
      : "Execution model: K deep research dossier first, then F/W/G parallel perspectives based on K.";
  }
  if (model === "research_task_evidence_independent_agent_calls") {
    return language === "zh"
      ? "执行模型：研究任务书和证据包先行，再执行独立 agent 调用。"
      : "Execution model: research task and evidence packet first, then independent agent calls.";
  }
  if (model === "independent_agent_calls") {
    return language === "zh"
      ? "执行模型：多个 agent 独立调用，独立输出和独立 hash。"
      : "Execution model: independent agent calls with independent outputs and hashes.";
  }
  if (model === "multi_perspective_single_call") {
    return language === "zh"
      ? "执行模型：一次 LLM 调用中的多视角输出，不应称为独立 agent。"
      : "Execution model: multi-perspective output from a single LLM call, not independent agents.";
  }
  return language === "zh" ? "执行模型：公开状态未报告。" : "Execution model: not reported by the public status.";
}
