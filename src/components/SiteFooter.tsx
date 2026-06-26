import { Github, ShieldCheck } from "lucide-react";
import packageJson from "../../package.json";
import type { LedgerMetadata } from "../data/schema";
import type { Language } from "../i18n/language";
import { copy, shortBoundarySentence } from "../i18n/language";
import { routeHref } from "../routes/hashRouter";

type SiteFooterProps = {
  metadata: LedgerMetadata;
  language: Language;
};

export function SiteFooter({ metadata, language }: SiteFooterProps) {
  const version = packageJson.version;

  return (
    <footer className="site-footer" id="site-footer" aria-labelledby="footer-title">
      <div>
        <span className="brand-mark footer-mark" aria-hidden="true">
          <span />
        </span>
        <h2 id="footer-title">{copy(language, "GOTRA Public Ledger 公开研究过程，也公开错误。", "GOTRA Public Ledger shows the research process and the errors.")}</h2>
        <p>
          {copy(language, "当前展示的是 public-safe frozen demo snapshot。它是产品与研究流程展示，不是交易信号、投资建议、科学证明或业绩证明。", "The current surface is a public-safe frozen demo snapshot. It is product and research-process evidence, not a trading signal, investment advice, scientific proof, or performance proof.")}
        </p>
      </div>
      <nav aria-label="Footer links">
        <a href={routeHref("/ledger")}>Ledger</a>
        <a href={routeHref("/system")}>System</a>
        <a href={routeHref("/methodology")}>Methodology</a>
        <a href={routeHref("/sources")}>Sources</a>
        <a href="https://github.com/amanayayatu-tech/gotra-public-ledger" target="_blank" rel="noreferrer">
          <Github aria-hidden="true" size={16} />
          GitHub repo
        </a>
        <a href="https://github.com/amanayayatu-tech/gotra-public-ledger/blob/main/docs/DATA_BOUNDARY.md" target="_blank" rel="noreferrer">
          {copy(language, "数据边界", "Data boundary")}
        </a>
        <a href="https://github.com/amanayayatu-tech/gotra-public-ledger/blob/main/docs/CLAIM_BOUNDARY.md" target="_blank" rel="noreferrer">
          {copy(language, "声明边界", "Claim boundary")}
        </a>
      </nav>
      <div className="footer-meta">
        <span>
          <ShieldCheck aria-hidden="true" size={14} />
          {shortBoundarySentence(language)}
        </span>
        <span>version {version}</span>
        <span>snapshot_date {metadata.snapshot_date}</span>
      </div>
    </footer>
  );
}
