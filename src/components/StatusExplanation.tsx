import { explainStatus } from "../data/statusExplanations";
import { copy, type Language } from "../i18n/language";

export function StatusExplanationCard({
  rawStatus,
  language,
  compact = false,
}: {
  rawStatus: string | null | undefined;
  language: Language;
  compact?: boolean;
}) {
  const status = explainStatus(rawStatus, language);

  return (
    <article className={`status-explanation-card ${compact ? "compact" : ""}`}>
      <span>{copy(language, "状态解释", "Status explanation")}</span>
      <strong>{status.title}</strong>
      <p>{status.explanation}</p>
      {!compact ? (
        <>
          <dl>
            <div>
              <dt>{copy(language, "证据层级", "Evidence layer")}</dt>
              <dd>{status.evidenceLayer}</dd>
            </div>
            <div>
              <dt>{copy(language, "它能证明", "What it proves")}</dt>
              <dd>{status.proves}</dd>
            </div>
            <div>
              <dt>{copy(language, "下一步", "Next action")}</dt>
              <dd>{status.nextAction}</dd>
            </div>
          </dl>
          <p className="muted">
            {copy(language, "不代表：", "Does not prove:")} {status.doesNotProve.join(" · ")}
          </p>
        </>
      ) : null}
      <details className="audit-details inline-status-code">
        <summary>{copy(language, "查看原始状态码", "View raw status code")}</summary>
        <code>{status.raw}</code>
      </details>
    </article>
  );
}
