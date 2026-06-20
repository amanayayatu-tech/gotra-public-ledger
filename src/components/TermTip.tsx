import { HelpCircle } from "lucide-react";
import { labelMap, type GlossaryKey } from "../data/glossary";

type TermTipProps = {
  term: GlossaryKey;
  compact?: boolean;
};

export function TermTip({ term, compact = false }: TermTipProps) {
  const entry = labelMap[term];

  return (
    <span className={`term-tip ${compact ? "compact" : ""}`}>
      <span>{entry.label}</span>
      <button type="button" aria-label={`${entry.label}: ${entry.help}`} title={entry.help}>
        <HelpCircle aria-hidden="true" size={13} />
      </button>
    </span>
  );
}

export function GlossaryStrip() {
  const entries = [
    "expected_change_pct",
    "actual_change_pct",
    "cumulative_accuracy",
    "average_error",
    "pending",
    "frozen_pending",
    "frozen_demo_snapshot",
    "oos",
    "direct_llm_parametric_memory_control",
  ] as const;

  return (
    <section className="glossary-strip" aria-label="Terminology glossary">
      <div className="glossary-chip-row">
        {entries.map((term) => (
          <TermTip term={term} key={term} />
        ))}
      </div>
      <dl className="glossary-list">
        {entries.map((term) => (
          <div key={term}>
            <dt>{labelMap[term].label}</dt>
            <dd>{labelMap[term].help}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
