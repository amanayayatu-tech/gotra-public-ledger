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
  const siteMapGroups = [
    {
      label: copy(language, "账本", "Ledger"),
      note: copy(language, "账本为冻结演示；表现页暂无生产表现。", "Ledger is a frozen demo; performance has no production tracking yet."),
      links: [
        { href: routeHref("/ledger"), label: copy(language, "冻结演示账本", "Frozen demo ledger") },
        { href: routeHref("/performance"), label: copy(language, "表现跟踪（暂无生产）", "Performance tracking (no production yet)") },
      ],
    },
    {
      label: copy(language, "报告", "Reports"),
      note: copy(language, "每日报告是生产公开产物；不是投资建议或交易信号。", "Daily reports are production public artifacts; not advice or trading signals."),
      links: [
        { href: routeHref("/reports"), label: copy(language, "每日报告", "Daily reports") },
        { href: routeHref("/notes"), label: copy(language, "简报复盘（含最新报告）", "Notes & reviews (latest reports)") },
      ],
    },
    {
      label: copy(language, "系统", "System"),
      note: copy(language, "方法和来源是审计与透明度材料。", "Methods and sources are audit and transparency materials."),
      links: [
        { href: routeHref("/system"), label: copy(language, "系统说明", "System overview") },
        { href: routeHref("/methodology"), label: copy(language, "方法论", "Methodology") },
        { href: routeHref("/sources"), label: copy(language, "来源与证据", "Sources & evidence") },
      ],
    },
  ];

  return (
    <footer className="site-footer" id="site-footer" aria-labelledby="footer-title">
      <div>
        <span className="brand-mark footer-mark" aria-hidden="true">
          <span />
        </span>
        <h2 id="footer-title">{copy(language, "GOTRA Public Ledger 公开研究过程，也公开错误。", "GOTRA Public Ledger shows the research process and the errors.")}</h2>
        <p>
          {copy(language, "每日报告为生产公开产物；账本与表现页包含冻结 demo/fixture，均不构成投资建议、交易信号、科学证明或业绩证明。", "Daily reports are production public artifacts; ledger and performance pages contain frozen demo/fixture material, and none of them are investment advice, trading signals, scientific proof, or performance proof.")}
        </p>
      </div>
      <nav className="footer-site-map" aria-label={copy(language, "站点地图", "Site map")}>
        <h3>{copy(language, "站点地图", "Site map")}</h3>
        <div className="footer-map-grid">
          {siteMapGroups.map((group) => (
            <section key={group.label}>
              <strong>{group.label}</strong>
              <div>
                {group.links.map((link) => (
                  <a href={link.href} key={link.href}>
                    {link.label}
                  </a>
                ))}
              </div>
              <p>{group.note}</p>
            </section>
          ))}
        </div>
      </nav>
      <nav className="footer-link-row" aria-label={copy(language, "外部与边界链接", "External and boundary links")}>
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
        <span>{copy(language, "版本", "version")} {version}</span>
        <span>{copy(language, "快照日期", "snapshot_date")} {metadata.snapshot_date}</span>
      </div>
    </footer>
  );
}
