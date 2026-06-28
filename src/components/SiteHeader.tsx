import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { Language } from "../i18n/language";
import { copy } from "../i18n/language";
import { routeHref } from "../routes/hashRouter";

const navItems = [
  { href: routeHref("/"), zh: "首页", en: "Home", path: "/" },
  { href: routeHref("/ledger"), zh: "账本", en: "Ledger", path: "/ledger" },
  { href: routeHref("/performance"), zh: "表现", en: "Performance", path: "/performance" },
  { href: routeHref("/system"), zh: "系统", en: "System", path: "/system" },
  { href: routeHref("/methodology"), zh: "方法", en: "Method", path: "/methodology" },
  { href: routeHref("/sources"), zh: "来源", en: "Sources", path: "/sources" },
  { href: routeHref("/reports"), zh: "报告", en: "Reports", path: "/reports" },
  { href: routeHref("/notes"), zh: "简报", en: "Notes", path: "/notes" },
];

type SiteHeaderProps = {
  activePath: string;
  language: Language;
  onLanguageChange: (language: Language) => void;
};

export function SiteHeader({ activePath, language, onLanguageChange }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar-main">
        <a className="brand" href={routeHref("/")} onClick={() => setMenuOpen(false)}>
          <span className="brand-mark" aria-hidden="true">
            GL
          </span>
          <div>
            <strong>GOTRA Public Ledger</strong>
            <span>{copy(language, "公开研究账本 · 错误也留痕", "Public research ledger · errors remain visible")}</span>
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
        {navItems.map((item) => (
          <a
            aria-current={activePath === item.path ? "page" : undefined}
            className={activePath === item.path ? "active" : ""}
            href={item.href}
            key={item.href}
            onClick={() => {
              setMenuOpen(false);
            }}
          >
            {copy(language, item.zh, item.en)}
          </a>
        ))}
        <div className="language-toggle" aria-label={copy(language, "语言切换", "Language switcher")}>
          <button
            aria-pressed={language === "zh"}
            className={language === "zh" ? "active" : ""}
            onClick={() => onLanguageChange("zh")}
            type="button"
          >
            中文
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
