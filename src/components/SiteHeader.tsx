import { Menu, X } from "lucide-react";
import { useState } from "react";
import type { Language } from "../i18n/language";
import { copy } from "../i18n/language";
import { routeHref } from "../routes/hashRouter";

type NavItem = {
  id: string;
  href: string;
  path: string;
  zh: string;
  en: string;
};

const navItems: NavItem[] = [
  { id: "today", href: routeHref("/today"), path: "/today", zh: "今日简报", en: "Today" },
  { id: "why", href: routeHref("/why-gotra"), path: "/why-gotra", zh: "为什么是 GOTRA", en: "Why GOTRA" },
  { id: "guide", href: routeHref("/guide"), path: "/guide", zh: "使用指南", en: "Guide" },
  { id: "reader", href: routeHref("/reports/full-analyst"), path: "/reports/full-analyst", zh: "研究阅读器", en: "Research Reader" },
  { id: "beta", href: routeHref("/beta"), path: "/beta", zh: "Beta 状态", en: "Beta Status" },
  { id: "track-record", href: routeHref("/track-record"), path: "/track-record", zh: "公开账本", en: "Track Record" },
  { id: "monthly-reports", href: routeHref("/monthly-reports"), path: "/monthly-reports", zh: "月报", en: "Monthly" },
  { id: "sources", href: routeHref("/sources"), path: "/sources", zh: "证据与来源", en: "Evidence & Sources" },
  { id: "methodology", href: routeHref("/methodology"), path: "/methodology", zh: "方法论", en: "Methodology" },
  { id: "audit", href: routeHref("/reports"), path: "/reports", zh: "审计中心", en: "Audit" },
];

function navLabel(item: NavItem, language: Language): string {
  return copy(language, item.zh, item.en);
}

type SiteHeaderProps = {
  activePath: string;
  language: Language;
  onLanguageChange: (language: Language) => void;
};

export function SiteHeader({ activePath, language, onLanguageChange }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="topbar">
      <div className="topbar-main">
        <a className="brand" href={routeHref("/")} onClick={closeMenu}>
          <span className="brand-mark" aria-hidden="true">
            G4
          </span>
          <div>
            <strong>GOTRA Public Ledger</strong>
            <span>{copy(language, "可审计研究发布账本", "Auditable research ledger")}</span>
          </div>
        </a>
        <button
          aria-controls="site-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? copy(language, "收起导航菜单", "Close navigation") : copy(language, "展开导航菜单", "Open navigation")}
          className="nav-toggle"
          onClick={() => setMenuOpen((current) => !current)}
          type="button"
        >
          {menuOpen ? <X aria-hidden="true" size={18} /> : <Menu aria-hidden="true" size={18} />}
        </button>
      </div>

      <nav
        aria-label={copy(language, "站点导航", "Site navigation")}
        className={`topbar-meta topbar-nav ${menuOpen ? "open" : ""}`}
        id="site-navigation"
      >
        {navItems.map((item) => {
          const active = activePath === item.path;
          return (
            <a
              aria-current={active ? "page" : undefined}
              className={`nav-primary-link ${active ? "active" : ""}`}
              href={item.href}
              key={item.id}
              onClick={closeMenu}
            >
              {navLabel(item, language)}
            </a>
          );
        })}

        <div className="language-toggle" aria-label={copy(language, "语言切换", "Language switch")}>
          <button
            aria-pressed={language === "zh"}
            className={language === "zh" ? "active" : ""}
            onClick={() => onLanguageChange("zh")}
            type="button"
          >
            中
          </button>
          <button
            aria-pressed={language === "en"}
            className={language === "en" ? "active" : ""}
            onClick={() => onLanguageChange("en")}
            type="button"
          >
            EN
          </button>
        </div>
      </nav>
    </header>
  );
}
