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
      label: copy(language, "今日简报", "Today"),
      note: copy(language, "每日先读读者化摘要、观察清单、数据缺口和下一步观察。", "Start with the reader brief, watchlist, data gaps, and next watch."),
      links: [
        { href: routeHref("/today"), label: copy(language, "今日研究简报", "Daily Research Brief") },
        { href: routeHref("/track-record"), label: copy(language, "公开研究账本", "Public research ledger") },
        { href: routeHref("/monthly-reports"), label: copy(language, "月度透明报告", "Monthly transparency reports") },
        { href: routeHref("/why-gotra"), label: copy(language, "为什么是 GOTRA", "Why GOTRA") },
        { href: routeHref("/guide"), label: copy(language, "如何阅读 GOTRA", "How to read GOTRA") },
      ],
    },
    {
      label: copy(language, "使用指南", "Guide"),
      note: copy(language, "七步阅读顺序、日报系统流、术语表和证据边界。", "Seven-step reading order, daily system flow, glossary, and evidence boundaries."),
      links: [
        { href: routeHref("/guide"), label: copy(language, "使用指南", "Guide") },
        { href: routeHref("/sources"), label: copy(language, "来源与产物", "Sources & artifacts") },
        { href: routeHref("/methodology"), label: copy(language, "方法论", "Methodology") },
      ],
    },
    {
      label: copy(language, "归档区", "Archive-only"),
      note: copy(language, "这些是归档/边界页面，不是 v4 主阅读路径。", "These are archive/boundary pages, not the primary v4 reading path."),
      links: [
        { href: routeHref("/ledger"), label: copy(language, "冻结 Demo 账本", "Frozen demo archive") },
        { href: routeHref("/performance"), label: copy(language, "表现边界说明", "Performance boundary notes") },
      ],
    },
    {
      label: copy(language, "审计中心", "v4 Audit Center"),
      note: copy(language, "审计中心展示运行状态、研究产物、缺口和 raw artifact 折叠区。", "The Audit Center shows runtime status, v4 research artifacts, gaps, and raw artifact disclosures."),
      links: [
        { href: routeHref("/reports"), label: copy(language, "审计中心", "Audit Center") },
        { href: "/reports/latest/", label: copy(language, "覆盖日报 reader", "Coverage report reader") },
        { href: routeHref("/reports/full-analyst"), label: copy(language, "研究阅读器", "Full Analyst reader") },
        { href: `${routeHref("/reports")}?focus=canary`, label: copy(language, "运行监控", "Runtime Monitoring") },
        { href: routeHref("/monthly-reports"), label: copy(language, "月报索引", "Monthly report index") },
        { href: routeHref("/notes"), label: copy(language, "透明度文章", "Transparency Articles") },
      ],
    },
    {
      label: copy(language, "系统", "System"),
      note: copy(language, "方法和来源是审计与透明度材料。", "Methods and sources are audit and transparency materials."),
      links: [
        { href: routeHref("/system"), label: copy(language, "系统说明", "System overview") },
        { href: routeHref("/methodology"), label: copy(language, "方法论", "Methodology") },
        { href: routeHref("/sources"), label: copy(language, "来源与产物", "Sources & artifacts") },
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
          {copy(language, "今日简报是每日读者入口；审计中心用于查看公开安全产物、状态和 raw artifact 折叠区。Demo 账本、表现说明与透明度文章属于归档材料。所有页面均不是投资建议、交易信号、科学证明或业绩证明。", "Today's Brief is the everyday reader entry; the Audit Center exposes public-safe artifacts, status, and raw artifact disclosures. Demo Ledger, Performance Notes, and Transparency Articles are archive materials. None of these pages are investment advice, trading signals, scientific proof, or performance proof.")}
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
