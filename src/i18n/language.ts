export type Language = "zh" | "en";

export const LANGUAGE_STORAGE_KEY = "gotra_public_ledger_language";

export function isLanguage(value: unknown): value is Language {
  return value === "zh" || value === "en";
}

export function readStoredLanguage(): Language {
  if (typeof window === "undefined") {
    return "zh";
  }

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isLanguage(stored) ? stored : "zh";
}

export function writeStoredLanguage(language: Language): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export function copy(language: Language, zh: string, en: string): string {
  return language === "zh" ? zh : en;
}

export function boundarySentence(language: Language): string {
  return copy(
    language,
    "研究信息。非投资建议。非交易信号。非实时交易。非业绩证明。不保证未来表现。",
    "Research information only. Not investment advice. Not a trading signal. Not live trading. Not performance proof. No guarantee of future performance.",
  );
}

export function shortBoundarySentence(language: Language): string {
  return copy(
    language,
    "研究信息 · 非投资建议 · 非交易信号 · 非业绩证明",
    "Research information only · Not investment advice · Not a trading signal · No performance proof",
  );
}

export function statusText(language: Language, status: string): string {
  const labels: Record<string, { zh: string; en: string }> = {
    resolved: { zh: "已结算", en: "Resolved" },
    pending: { zh: "待判定", en: "Pending" },
    frozen_pending: { zh: "冻结待判定", en: "Frozen pending" },
    blocked_missing_price: { zh: "缺价格阻塞", en: "Blocked: missing price" },
    blocked_symbol_change: { zh: "代码变更阻塞", en: "Blocked: symbol change" },
    blocked_market_holiday_conflict: { zh: "市场日历冲突", en: "Blocked: market holiday conflict" },
    blocked_corporate_action_conflict: { zh: "公司行动冲突", en: "Blocked: corporate action conflict" },
    needs_review: { zh: "待复核", en: "Needs review" },
    published: { zh: "已发布", en: "Published" },
    published_public_safe: { zh: "已发布 · 公开安全", en: "Published · public-safe" },
    draft_public_safe: { zh: "草稿 · 公开安全", en: "Draft · public-safe" },
    demo_format: { zh: "演示格式", en: "Demo format" },
    unchanged_no_evidence: { zh: "未变化 · 无新增公开证据", en: "Unchanged · no new public evidence" },
    unchanged_evidence_reviewed: { zh: "未变化 · 已复核证据", en: "Unchanged · evidence reviewed" },
    updated_on_resolution: { zh: "已更新 · 因记录结算", en: "Updated · record resolved" },
    updated_on_evidence: { zh: "已更新 · 因新增公开证据", en: "Updated · new public evidence" },
    no_new_evidence: { zh: "未变化 · 无新增公开证据", en: "Unchanged · no new public evidence" },
    unchanged: { zh: "未变化 · 已复核证据", en: "Unchanged · evidence reviewed" },
    strengthened: { zh: "增强", en: "Strengthened" },
    weakened: { zh: "减弱", en: "Weakened" },
    conflict_found: { zh: "发现冲突", en: "Conflict found" },
  };
  const label = labels[status];
  if (label) {
    return language === "zh" ? label.zh : label.en;
  }
  return status.replaceAll("_", " ");
}

export function directionText(language: Language, direction: string): string {
  if (direction === "up") {
    return copy(language, "看涨", "Up");
  }
  if (direction === "down") {
    return copy(language, "看跌", "Down");
  }
  return copy(language, "中性", "Neutral");
}

export function contentTypeText(language: Language, type: string): string {
  const labels: Record<string, { zh: string; en: string }> = {
    method_note: { zh: "方法说明", en: "Method note" },
    weekly_review: { zh: "周度账本更新", en: "Weekly ledger update" },
    error_review: { zh: "错误复盘", en: "Error review" },
    monthly_transparency: { zh: "透明度说明", en: "Transparency note" },
    daily_morning_brief: { zh: "晨间简报", en: "Morning brief" },
    daily_evening_review: { zh: "晚间复盘", en: "Evening review" },
    research_recap: { zh: "研究回顾", en: "Research recap" },
  };
  const label = labels[type];
  if (label) {
    return language === "zh" ? label.zh : label.en;
  }
  return type.replaceAll("_", " ");
}

export function layerText(language: Language, layer: string): string {
  const labels: Record<string, { zh: string; en: string }> = {
    background: { zh: "背景层", en: "Background layer" },
    evidence: { zh: "证据层", en: "Evidence layer" },
    background_and_evidence: { zh: "背景 + 证据层", en: "Background + evidence" },
    no_new_evidence: { zh: "无新增公开证据", en: "No new public evidence" },
    public_safe_demo: { zh: "公开安全演示数据", en: "Public-safe demo" },
    local_checks: { zh: "本地检查", en: "Local checks" },
  };
  const label = labels[layer];
  if (label) {
    return language === "zh" ? label.zh : label.en;
  }
  return layer.replaceAll("_", " ");
}

export function runtimeStatusText(language: Language, status: string | null | undefined): string {
  const value = status ?? "unknown";
  const labels: Record<string, { zh: string; en: string }> = {
    active: { zh: "活跃", en: "Active" },
    artifact_write_failed: { zh: "产物写入失败", en: "Artifact write failed" },
    blocked: { zh: "已阻断", en: "Blocked" },
    completed: { zh: "已完成", en: "Completed" },
    completed_with_allowed_data_gaps: { zh: "已完成，存在允许的数据缺口", en: "Completed with allowed data gaps" },
    completed_with_blockers: { zh: "已完成，存在阻断项", en: "Completed with blockers" },
    completed_with_review_items: { zh: "已完成，存在复核项", en: "Completed with review items" },
    critical: { zh: "严重", en: "Critical" },
    degraded: { zh: "降级", en: "Degraded" },
    disabled: { zh: "已停用", en: "Disabled" },
    enabled: { zh: "已启用", en: "Enabled" },
    failed: { zh: "失败", en: "Failed" },
    fail: { zh: "失败", en: "Fail" },
    healthy: { zh: "健康", en: "Healthy" },
    manual_ssh_runbook: { zh: "手动 SSH 回滚手册", en: "Manual SSH runbook" },
    not_applicable: { zh: "不适用", en: "Not applicable" },
    ok: { zh: "正常", en: "OK" },
    partial: { zh: "部分完成", en: "Partial" },
    pending: { zh: "待产物", en: "Pending" },
    published: { zh: "已发布", en: "Published" },
    running: { zh: "运行中", en: "Running" },
    running_with_warnings: { zh: "运行中，有警告", en: "Running with warnings" },
    stale: { zh: "已过期", en: "Stale" },
    success: { zh: "成功", en: "Success" },
    unavailable: { zh: "不可用", en: "Unavailable" },
    unknown: { zh: "未知", en: "Unknown" },
  };
  const label = labels[value];
  if (label) {
    return language === "zh" ? label.zh : label.en;
  }
  return language === "zh" ? value.replaceAll("_", " ") : value.replaceAll("_", " ");
}

export function fullAnalystLabelText(language: Language, key: string): string {
  const labels: Record<string, { zh: string; en: string }> = {
    alaya_readback: { zh: "内部 Alaya 回读", en: "Alaya readback" },
    alaya_sync: { zh: "内部 Alaya 同步", en: "Alaya sync" },
    artifact_freshness: { zh: "产物新鲜度", en: "Artifact freshness" },
    canary: { zh: "Full Analyst 金丝雀", en: "Full Analyst Canary" },
    canary_full_chain: { zh: "Full Analyst 金丝雀完整链路", en: "Full Analyst Canary Full Chain" },
    cycle: { zh: "循环", en: "Cycle" },
    elapsed: { zh: "已运行", en: "Elapsed" },
    exchange_split: { zh: "交易所分布", en: "Exchange split" },
    heartbeat: { zh: "心跳", en: "Heartbeat" },
    heartbeat_freshness: { zh: "心跳新鲜度", en: "Heartbeat freshness" },
    latest_run: { zh: "最近运行", en: "Latest run" },
    overall_health: { zh: "整体健康", en: "Overall health" },
    phase: { zh: "阶段", en: "Phase" },
    public_scan: { zh: "公开安全扫描", en: "Public scan" },
    publish: { zh: "发布", en: "Publish" },
    review_blocked_gap: { zh: "需复核 / 阻断 / 数据缺口", en: "Review / blocked / gap" },
    rollback_mode: { zh: "回滚方式", en: "Rollback mode" },
    rollback_runbook: { zh: "回滚手册", en: "Rollback runbook" },
    run_id: { zh: "运行 ID", en: "Run ID" },
    runner: { zh: "运行器", en: "Runner" },
    service_state: { zh: "服务状态", en: "Service state" },
    service_timer: { zh: "服务 / 定时器", en: "Service / timer" },
    status_files: { zh: "状态文件", en: "Status files" },
    timer_state: { zh: "定时器状态", en: "Timer state" },
    universe: { zh: "股票池", en: "Universe" },
  };
  const label = labels[key];
  if (label) {
    return language === "zh" ? label.zh : label.en;
  }
  return key.replaceAll("_", " ");
}

export function fullAnalystStageText(language: Language, stage: string): string {
  const labels: Record<string, { zh: string; en: string }> = {
    alaya_readback: { zh: "内部 Alaya 回读", en: "Alaya readback" },
    alaya_sync: { zh: "内部 Alaya 同步", en: "Alaya sync" },
    artifact_write: { zh: "产物写入", en: "Artifact write" },
    data_fetch: { zh: "数据抓取 / 覆盖率", en: "Data fetch / coverage" },
    judge_gate: { zh: "裁判 / 闸门", en: "Judge / gate" },
    llm_analyst: { zh: "LLM 分析", en: "LLM analyst" },
    public_publish: { zh: "公开发布", en: "Public publish" },
    public_safety_scan: { zh: "公开安全扫描", en: "Public safety scan" },
  };
  const label = labels[stage];
  if (label) {
    return language === "zh" ? label.zh : label.en;
  }
  return stage.replaceAll("_", " ");
}

export function artifactStatusText(language: Language, status: string): string {
  const labels: Record<string, { zh: string; en: string }> = {
    "full analyst canary markdown": { zh: "Full Analyst 金丝雀 Markdown 报告", en: "Full analyst canary markdown" },
    "ordinary daily alias": { zh: "日报状态别名", en: "Daily status alias" },
    "ordinary daily latest": { zh: "最新日报 Markdown", en: "Latest daily markdown" },
  };
  const label = labels[status];
  if (label) {
    return language === "zh" ? label.zh : label.en;
  }
  return runtimeStatusText(language, status);
}
