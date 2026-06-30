import { describe, expect, it } from "vitest";
import {
  artifactStatusText,
  fullAnalystLabelText,
  fullAnalystStageText,
  runtimeStatusText,
} from "./language";

describe("language label maps", () => {
  it("localizes common Full Analyst monitor labels in Chinese mode", () => {
    expect(fullAnalystLabelText("zh", "canary")).toBe("Full Analyst 金丝雀");
    expect(fullAnalystLabelText("zh", "service_timer")).toBe("服务 / 定时器");
    expect(fullAnalystLabelText("zh", "timer_state")).toBe("定时器状态");
    expect(fullAnalystLabelText("zh", "run_id")).toBe("运行 ID");
    expect(fullAnalystLabelText("zh", "phase")).toBe("阶段");
    expect(fullAnalystLabelText("zh", "universe")).toBe("股票池");
    expect(fullAnalystLabelText("zh", "public_scan")).toBe("公开安全扫描");
    expect(fullAnalystLabelText("zh", "artifact_freshness")).toBe("产物新鲜度");
    expect(fullAnalystLabelText("zh", "rollback_runbook")).toBe("回滚手册");
  });

  it("localizes full-chain stage labels in Chinese mode", () => {
    expect(fullAnalystStageText("zh", "data_fetch")).toBe("数据抓取 / 覆盖率");
    expect(fullAnalystStageText("zh", "llm_analyst")).toBe("LLM 分析");
    expect(fullAnalystStageText("zh", "judge_gate")).toBe("裁判 / 闸门");
    expect(fullAnalystStageText("zh", "alaya_sync")).toBe("内部 Alaya 同步");
    expect(fullAnalystStageText("zh", "alaya_readback")).toBe("内部 Alaya 回读");
    expect(fullAnalystStageText("zh", "public_publish")).toBe("公开发布");
  });

  it("keeps code-like status values readable without English label leakage", () => {
    expect(runtimeStatusText("zh", "completed")).toBe("已完成");
    expect(runtimeStatusText("zh", "completed_with_allowed_data_gaps")).toBe("已完成，存在允许的数据缺口");
    expect(runtimeStatusText("zh", "manual_ssh_runbook")).toBe("手动 SSH 回滚手册");
    expect(artifactStatusText("zh", "ordinary daily latest")).toBe("最新日报 Markdown");

    const zhLabels = [
      fullAnalystLabelText("zh", "service_timer"),
      fullAnalystLabelText("zh", "timer_state"),
      fullAnalystLabelText("zh", "run_id"),
      fullAnalystLabelText("zh", "phase"),
      fullAnalystLabelText("zh", "universe"),
      fullAnalystLabelText("zh", "public_scan"),
      fullAnalystStageText("zh", "data_fetch"),
      fullAnalystStageText("zh", "judge_gate"),
      fullAnalystStageText("zh", "public_publish"),
    ].join("\n");

    expect(zhLabels).not.toMatch(/SERVICE|TIMER STATE|RUN_ID|PHASE|UNIVERSE|PUBLIC SCAN/i);
    expect(zhLabels).not.toMatch(/data fetch|judge\/gate|public publish/i);
  });
});
