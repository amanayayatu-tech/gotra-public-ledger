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
    published_public_safe: { zh: "已发布 · public-safe", en: "Published · public-safe" },
    draft_public_safe: { zh: "草稿 · public-safe", en: "Draft · public-safe" },
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
    public_safe_demo: { zh: "public-safe 演示数据", en: "Public-safe demo" },
    local_checks: { zh: "本地检查", en: "Local checks" },
  };
  const label = labels[layer];
  if (label) {
    return language === "zh" ? label.zh : label.en;
  }
  return layer.replaceAll("_", " ");
}
