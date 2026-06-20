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
  return (
    <section className="glossary-strip" aria-label="Terminology glossary">
      <TermTip term="expected_change_pct" />
      <TermTip term="actual_change_pct" />
      <TermTip term="cumulative_accuracy" />
      <TermTip term="average_error" />
      <TermTip term="frozen_pending" />
      <TermTip term="frozen_demo_snapshot" />
      <TermTip term="oos" />
      <TermTip term="direct_llm_parametric_memory_control" />
    </section>
  );
}
