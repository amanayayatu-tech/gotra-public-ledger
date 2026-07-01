export const labelMap = {
  expected_change_pct: {
    label: "预测涨跌幅",
    help: "模型在该预测窗口内预期的涨跌百分比。",
  },
  actual_change_pct: {
    label: "实际涨跌幅",
    help: "窗口结束后观察到的实际涨跌百分比。",
  },
  direction_hit_rate: {
    label: "方向命中率",
    help: "在已结算记录中，预测方向和实际方向一致的比例。",
  },
  cumulative_accuracy: {
    label: "累计准确率",
    help: "按时间累积计算的方向命中率，只使用已结算记录。",
  },
  average_error: {
    label: "平均误差",
    help: "预测涨跌幅与实际涨跌幅的平均绝对差，单位是百分点，越低越好。",
  },
  pending: {
    label: "待判定",
    help: "结果尚未进入可判定状态。",
  },
  frozen_pending: {
    label: "冻结待判定",
    help: "源快照中仍标为 pending，但该页面不回填/不伪造后验结果。",
  },
  frozen_demo_snapshot: {
    label: "冻结演示快照",
    help: "冻结的公开安全演示数据，不是实时数据流。",
  },
  oos: {
    label: "OOS",
    help: "样本外验证的缩写；本页面不声称已完成或证明样本外验证。",
  },
  direct_llm_parametric_memory_control: {
    label: "direct_llm_parametric_memory_control",
    help: "现代大模型参数记忆对照组，不是干净的无未来信息基线。",
  },
} as const;

export type GlossaryKey = keyof typeof labelMap;

export type TermKey =
  | "daily_brief"
  | "full_analyst"
  | "canary"
  | "agent_matrix"
  | "red_team"
  | "risk_factors"
  | "watch_items"
  | "data_gap"
  | "judge_gate"
  | "public_safe"
  | "alaya_readback"
  | "evidence_layer"
  | "demo_ledger"
  | "performance_proof"
  | "science_public_proof"
  | "trading_signal";

export type LocalizedTerm = {
  term: string;
  label: {
    zh: string;
    en: string;
  };
  explanation: {
    zh: string;
    en: string;
  };
};

export const terms: Record<TermKey, LocalizedTerm> = {
  daily_brief: {
    term: "Daily Brief",
    label: { zh: "今日简报 / 今天先看这个", en: "Daily Brief" },
    explanation: {
      zh: "当天读者入口，先看这里了解今天有什么变化、哪些数据缺口需要注意、下一步该核对什么。",
      en: "The reader-first entry for today's update: what changed, which data gaps matter, and what to check next.",
    },
  },
  full_analyst: {
    term: "Full Analyst",
    label: { zh: "深度分析报告 / 完整研究链路", en: "Full Analyst" },
    explanation: {
      zh: "候选研究链路，输出 per-symbol agent 分析、正反观点、反方审查、风险和观察项；不是正式结论升级。",
      en: "A candidate research chain with per-symbol agent analysis, positive/negative cases, red-team review, risks, and watch items; not a formal conclusion upgrade.",
    },
  },
  canary: {
    term: "Canary",
    label: { zh: "先行试跑 / 小范围观察", en: "Canary" },
    explanation: {
      zh: "受控试运行或候选链路，用于观察健康度、公开扫描和回滚状态，不等于生产毕业。",
      en: "A controlled trial or candidate chain used to observe health, public scan, and rollback state; not production graduation.",
    },
  },
  agent_matrix: {
    term: "Agent matrix",
    label: { zh: "Agent 分析矩阵", en: "Agent matrix" },
    explanation: {
      zh: "按标的列出研究摘要、正方、反方、red-team、风险、观察项和来源摘要的公开安全矩阵。",
      en: "A public-safe per-symbol matrix of summary, positive case, negative case, red-team review, risks, watch items, and source notes.",
    },
  },
  red_team: {
    term: "Red-team",
    label: { zh: "反方审查", en: "Red-team" },
    explanation: {
      zh: "主动寻找过度声明、隐藏假设、反证缺失和边界破坏的审查步骤。",
      en: "A review step that actively searches for overclaims, hidden assumptions, missing counterevidence, and boundary breaks.",
    },
  },
  risk_factors: {
    term: "Risk factors",
    label: { zh: "风险因素", en: "Risk factors" },
    explanation: {
      zh: "可能使研究观察失效、需要继续跟踪或需要读者谨慎理解的条件。",
      en: "Conditions that could invalidate the research observation, need more tracking, or require reader caution.",
    },
  },
  watch_items: {
    term: "Watch items",
    label: { zh: "观察项", en: "Watch items" },
    explanation: {
      zh: "下一次要复核的问题、数据点、事件或来源状态。",
      en: "Questions, data points, events, or source states to check next.",
    },
  },
  data_gap: {
    term: "Data gap",
    label: { zh: "数据缺口", en: "Data gap" },
    explanation: {
      zh: "公开数据源覆盖缺失、价格缺失或状态文件标记的允许/非预期缺口；不会用私有数据补齐。",
      en: "A missing public-source coverage, price, or status-file gap, allowed or unexpected; private data is not used to fill it.",
    },
  },
  judge_gate: {
    term: "Judge gate",
    label: { zh: "审查门禁 / 质量闸", en: "Judge gate" },
    explanation: {
      zh: "发布前的结构、覆盖、公开安全和边界闸门，失败时保留 blocked/needs_review/data_gap。",
      en: "The pre-publication structure, coverage, public-safety, and boundary gate; failures remain blocked/needs_review/data_gap.",
    },
  },
  public_safe: {
    term: "Public-safe",
    label: { zh: "公开可展示 / 已去敏", en: "Public-safe" },
    explanation: {
      zh: "可以公开给读者和爬虫的摘要或产物，不含 raw I/O、secrets、私有日志、数据库或凭据。",
      en: "A summary or artifact safe for readers and crawlers, without raw I/O, secrets, private logs, databases, or credentials.",
    },
  },
  alaya_readback: {
    term: "Alaya readback",
    label: { zh: "系统记忆回读 / 内部知识状态回读", en: "Alaya readback" },
    explanation: {
      zh: "这里只指 GOTRA repo 内部 cognition flywheel / knowledge memory / feedback state / hash-chain readback，不是外部服务或独立 repo。",
      en: "Here this means GOTRA repo internal cognition flywheel, knowledge memory, feedback state, and hash-chain readback, not an external service or separate repo.",
    },
  },
  evidence_layer: {
    term: "Evidence layer",
    label: { zh: "证据层级", en: "Evidence layer" },
    explanation: {
      zh: "local checks、smoke evidence、long-run/formal acceptance、science/public claim 等证据等级的分离。",
      en: "The separation between local checks, smoke evidence, long-run/formal acceptance, and science/public claim layers.",
    },
  },
  demo_ledger: {
    term: "Demo Ledger",
    label: { zh: "Demo 账本", en: "Demo Ledger" },
    explanation: {
      zh: "冻结 public-safe 演示快照，用于可读性和审计样例；不是最新生产日报或实时预测账本。",
      en: "A frozen public-safe demo snapshot for readability and audit examples; not the latest production report or live prediction ledger.",
    },
  },
  performance_proof: {
    term: "Performance proof",
    label: { zh: "业绩证明，当前不提供", en: "Performance proof" },
    explanation: {
      zh: "证明生产策略收益或表现的证据。本网站当前明确不提供这种证明。",
      en: "Evidence that proves production returns or performance. This site explicitly does not provide it.",
    },
  },
  science_public_proof: {
    term: "Science/public proof",
    label: { zh: "科学/公开有效性证明，当前不提供", en: "Science/public proof" },
    explanation: {
      zh: "足以支持科学或公开有效性结论的验证。本网站当前不把日报或 smoke 说成这种证明。",
      en: "Validation strong enough to support a scientific or public-validity claim. Daily reports or smoke checks are not described as that proof.",
    },
  },
  trading_signal: {
    term: "Trading signal",
    label: { zh: "交易性指令，当前不提供", en: "Trading signal" },
    explanation: {
      zh: "买卖、持有、仓位或价格目标指令。本网站不提供这类指令或投资建议。",
      en: "A buy, sell, hold, position, or target-price instruction. This site does not provide trading signals or investment advice.",
    },
  },
};

export const termList = Object.values(terms);
