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
