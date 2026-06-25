import { Github, ShieldCheck } from "lucide-react";
import packageJson from "../../package.json";
import type { LedgerMetadata } from "../data/schema";
import { routeHref } from "../routes/hashRouter";

type SiteFooterProps = {
  metadata: LedgerMetadata;
};

export function SiteFooter({ metadata }: SiteFooterProps) {
  const version = packageJson.version;

  return (
    <footer className="site-footer" id="site-footer" aria-labelledby="footer-title">
      <div>
        <span className="brand-mark footer-mark" aria-hidden="true">
          <span />
        </span>
        <h2 id="footer-title">大多数金融内容制造注意力，GOTRA 制造信用。</h2>
        <p>
          GOTRA Public Ledger 当前展示的是 public-safe frozen demo snapshot。它是前端 UX/product narrative evidence，
          不是研究结论、交易信号或投资建议。
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
          数据边界
        </a>
        <a href="https://github.com/amanayayatu-tech/gotra-public-ledger/blob/main/docs/CLAIM_BOUNDARY.md" target="_blank" rel="noreferrer">
          claim boundary
        </a>
      </nav>
      <div className="footer-meta">
        <span>
          <ShieldCheck aria-hidden="true" size={14} />
          research information only · not investment advice
        </span>
        <span>version {version}</span>
        <span>snapshot_date {metadata.snapshot_date}</span>
      </div>
    </footer>
  );
}
