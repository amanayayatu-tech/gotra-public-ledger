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
    help: "预测涨跌幅与实际涨跌幅的平均绝对差，单位是 percentage points，越低越好。",
  },
  pending: {
    label: "pending",
    help: "结果尚未进入可判定状态。",
  },
  frozen_pending: {
    label: "frozen_pending",
    help: "源快照中仍标为 pending，但该页面不回填/不伪造后验结果。",
  },
  frozen_demo_snapshot: {
    label: "frozen demo snapshot",
    help: "冻结的 public-safe demo 数据，不是 live feed。",
  },
  oos: {
    label: "OOS",
    help: "out-of-sample validation；本页面不声称已证明 OOS。",
  },
  direct_llm_parametric_memory_control: {
    label: "direct_llm_parametric_memory_control",
    help: "现代 LLM 参数记忆对照组，不是 clean no-future baseline。",
  },
} as const;

export type GlossaryKey = keyof typeof labelMap;
