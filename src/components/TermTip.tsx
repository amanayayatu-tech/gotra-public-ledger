import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { labelMap, type GlossaryKey } from "../data/glossary";

type TermTipProps = {
  term: GlossaryKey;
  compact?: boolean;
};

export function TermTip({ term, compact = false }: TermTipProps) {
  const [open, setOpen] = useState(false);
  const entry = labelMap[term];

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
