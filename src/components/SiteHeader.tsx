import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import type { Language } from "../i18n/language";
import { copy } from "../i18n/language";
import { routeHref } from "../routes/hashRouter";

type NavChild = {
  href: string;
  path: string;
  zh: string;
  en: string;
  zhDescription: string;
  enDescription: string;
};

type NavGroup = {
  id: "today" | "guide" | "home" | "ledger" | "reports" | "system";
  zh: string;
  en: string;
  href?: string;
  paths: string[];
  children?: NavChild[];
};

const navGroups: NavGroup[] = [
  {
    id: "today",
    href: routeHref("/today"),
    zh: "今日简报",
    en: "Today",
    paths: ["/today"],
  },
  {
    id: "guide",
    href: routeHref("/guide"),
    zh: "使用指南",
    en: "Guide",
    paths: ["/guide"],
  },
  {
    id: "home",
    href: routeHref("/"),
    zh: "首页",
    en: "Home",
    paths: ["/"],
  },
  {
    id: "ledger",
    zh: "演示",
    en: "Demo",
    paths: ["/ledger", "/performance"],
    children: [
      {
        href: routeHref("/ledger"),
        path: "/ledger",
        zh: "Demo 账本",
        en: "Demo Ledger",
        zhDescription: "查看冻结演示记录；最新生产日报在生产日报入口。",
        enDescription: "Inspect frozen demo records; latest production reports are under Reports.",
      },
      {
        href: routeHref("/performance"),
        path: "/performance",
        zh: "表现说明",
        en: "Performance Notes",
        zhDescription: "暂无生产表现；演示夹具样本只放在折叠区。",
        enDescription: "No production performance yet; demo fixture is kept as a collapsed sample.",
      },
    ],
  },
  {
    id: "reports",
    zh: "生产",
    en: "Production Reports",
    paths: ["/reports", "/notes"],
    children: [
      {
        href: routeHref("/reports"),
        path: "/reports",
        zh: "生产日报",
        en: "Production Daily Reports",
        zhDescription: "查看五个日报、覆盖率和异常清单；不是投资建议。",
        enDescription: "Open stock-pool reports, coverage, and exceptions; not investment advice.",
      },
      {
        href: `${routeHref("/reports")}?focus=canary`,
        path: "/reports",
        zh: "先行试跑监控",
        en: "Canary Monitoring",
        zhDescription: "查看 Full Analyst 先行试跑、心跳、公开扫描和回滚状态。",
        enDescription: "Inspect Full Analyst Canary, heartbeat, public scan, and rollback state.",
      },
      {
        href: routeHref("/notes"),
        path: "/notes",
        zh: "透明度文章",
        en: "Transparency Articles",
        zhDescription: "静态文章归档，不是最新生产日报。",
        enDescription: "Static article archive, not latest production reports.",
      },
    ],
  },
  {
    id: "system",
    zh: "系统",
    en: "System",
    paths: ["/system", "/methodology", "/sources"],
    children: [
      {
        href: routeHref("/system"),
        path: "/system",
        zh: "系统说明",
        en: "System overview",
        zhDescription: "了解研究认知系统、运行边界和失败条件。",
        enDescription: "Understand the research cognition system, operating boundaries, and failure conditions.",
      },
      {
        href: routeHref("/methodology"),
        path: "/methodology",
        zh: "方法论",
        en: "Methodology",
        zhDescription: "查看股票池、结算器、假设组合和数据边界方法。",
        enDescription: "Review universe, resolver, paper portfolio, and data-boundary methods.",
      },
      {
        href: routeHref("/sources"),
        path: "/sources",
        zh: "来源与产物",
        en: "Sources & Artifacts",
        zhDescription: "查看生产公开产物、静态清单和证据索引。",
        enDescription: "Inspect live report artifacts, static manifests, and evidence indexes.",
      },
    ],
  },
];

function navLabel(group: Pick<NavGroup, "zh" | "en"> | Pick<NavChild, "zh" | "en">, language: Language): string {
  return copy(language, group.zh, group.en);
}

function navDescription(child: NavChild, language: Language): string {
  return copy(language, child.zhDescription, child.enDescription);
}

function isGroupActive(group: NavGroup, activePath: string): boolean {
  return group.paths.includes(activePath);
}

type SiteHeaderProps = {
  activePath: string;
  language: Language;
  onLanguageChange: (language: Language) => void;
};

export function SiteHeader({ activePath, language, onLanguageChange }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<NavGroup["id"] | null>(null);

  const closeMenus = () => {
    setMenuOpen(false);
    setOpenGroup(null);
  };

  return (
    <header className="topbar">
      <div className="topbar-main">
        <a className="brand" href={routeHref("/")} onClick={closeMenus}>
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
        {navGroups.map((group) => {
          const groupActive = isGroupActive(group, activePath);
          if (!group.children || group.href) {
            return (
              <a
                aria-current={groupActive ? "page" : undefined}
                className={`nav-primary-link ${groupActive ? "active" : ""}`}
                href={group.href ?? routeHref("/")}
                key={group.id}
                onClick={closeMenus}
              >
                {navLabel(group, language)}
              </a>
            );
          }

          const expanded = openGroup === group.id;
          const menuExpanded = expanded || menuOpen;
          return (
            <div
              className={`nav-group ${expanded ? "open" : ""} ${groupActive ? "active" : ""}`}
              key={group.id}
              onMouseEnter={() => setOpenGroup(group.id)}
              onMouseLeave={() => setOpenGroup((current) => (current === group.id ? null : current))}
            >
              <button
                aria-current={groupActive ? "page" : undefined}
                aria-expanded={menuExpanded}
                aria-haspopup="menu"
                className={`nav-group-trigger ${groupActive ? "active" : ""}`}
                onClick={() => setOpenGroup((current) => (current === group.id ? null : group.id))}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setOpenGroup(null);
                  }
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setOpenGroup(group.id);
                  }
                }}
                type="button"
              >
                {navLabel(group, language)}
                <ChevronDown aria-hidden="true" size={14} />
              </button>
              <div className="nav-group-menu" role="menu" aria-label={navLabel(group, language)}>
                {group.children.map((child) => (
                  <a
                    aria-current={activePath === child.path ? "page" : undefined}
                    className={`nav-menu-item ${activePath === child.path ? "active" : ""}`}
                    href={child.href}
                    key={child.path}
                    onClick={closeMenus}
                    role="menuitem"
                  >
                    <span>{navLabel(child, language)}</span>
                    <small>{navDescription(child, language)}</small>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
        <div className="language-toggle" aria-label={copy(language, "语言切换", "Language switcher")}>
          <button
            aria-pressed={language === "zh"}
            className={language === "zh" ? "active" : ""}
            onClick={() => {
              setOpenGroup(null);
              onLanguageChange("zh");
            }}
            type="button"
          >
            中文
          </button>
          <button
            aria-pressed={language === "en"}
            className={language === "en" ? "active" : ""}
            onClick={() => {
              setOpenGroup(null);
              onLanguageChange("en");
            }}
            type="button"
          >
            EN
          </button>
        </div>
      </nav>
    </header>
  );
}
