import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { labelMap, type GlossaryKey } from "../data/glossary";
import { copy, type Language } from "../i18n/language";

type TermTipProps = {
  term: GlossaryKey;
  compact?: boolean;
  language?: Language;
};

const englishLabelMap: Record<GlossaryKey, { label: string; help: string }> = {
  expected_change_pct: {
    label: "Expected change %",
    help: "The model's expected percentage move over the prediction window.",
  },
  actual_change_pct: {
    label: "Actual change %",
    help: "The observed percentage move after the prediction window ends.",
  },
  direction_hit_rate: {
    label: "Direction hit rate",
    help: "The share of resolved records where predicted direction matched the actual direction.",
  },
  cumulative_accuracy: {
    label: "Cumulative accuracy",
    help: "Time-accumulated direction hit rate using resolved records only.",
  },
  average_error: {
    label: "Average error",
    help: "Average absolute difference between expected and actual move, in percentage points.",
  },
  pending: {
    label: "Pending",
    help: "The outcome has not entered a resolvable state yet.",
  },
  frozen_pending: {
    label: "Frozen pending",
    help: "The source snapshot remains pending; this page does not backfill or invent later outcomes.",
  },
  frozen_demo_snapshot: {
    label: "Frozen demo snapshot",
    help: "A frozen public-safe demo dataset, not a live data stream.",
  },
  oos: {
    label: "OOS",
    help: "Short for out-of-sample validation; this page does not claim it is completed or proven.",
  },
  direct_llm_parametric_memory_control: {
    label: "direct_llm_parametric_memory_control",
    help: "A modern LLM parametric-memory control, not a clean no-future-information baseline.",
  },
};

function glossaryEntry(term: GlossaryKey, language: Language) {
  const entry = labelMap[term];
  const english = englishLabelMap[term];
  return {
    label: copy(language, entry.label, english.label),
    help: copy(language, entry.help, english.help),
  };
}

export function TermTip({ term, compact = false, language = "zh" }: TermTipProps) {
  const [open, setOpen] = useState(false);
  const entry = glossaryEntry(term, language);

  return (
    <span className={`term-tip ${compact ? "compact" : ""} ${open ? "open" : ""}`}>
      <span>{entry.label}</span>
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${entry.label}: ${entry.help}`}
        onClick={() => setOpen((current) => !current)}
        title={entry.help}
      >
        <HelpCircle aria-hidden="true" size={13} />
      </button>
      <span className="term-popover" role="tooltip">
        {entry.help}
      </span>
    </span>
  );
}

export function GlossaryStrip({ language = "zh" }: { language?: Language }) {
  const entries = [
    "expected_change_pct",
    "actual_change_pct",
    "cumulative_accuracy",
    "average_error",
    "pending",
    "frozen_pending",
    "frozen_demo_snapshot",
    "oos",
  ] as const;

  return (
    <section className="glossary-strip" aria-label="Terminology glossary">
      <div className="glossary-chip-row">
        {entries.map((term) => (
          <TermTip term={term} key={term} language={language} />
        ))}
      </div>
      <dl className="glossary-list">
        {entries.map((term) => {
          const entry = glossaryEntry(term, language);
          return (
            <div key={term}>
              <dt>{entry.label}</dt>
              <dd>{entry.help}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
