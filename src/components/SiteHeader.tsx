import { useState } from "react";
import { Menu, X } from "lucide-react";
import { routeHref } from "../routes/hashRouter";

const navItems = [
  { href: routeHref("/"), label: "首页", path: "/" },
  { href: routeHref("/ledger"), label: "账本", path: "/ledger" },
  { href: routeHref("/performance"), label: "表现", path: "/performance" },
  { href: routeHref("/system"), label: "系统", path: "/system" },
  { href: routeHref("/methodology"), label: "方法", path: "/methodology" },
  { href: routeHref("/sources"), label: "来源", path: "/sources" },
  { href: routeHref("/notes"), label: "Notes", path: "/notes" },
];

type SiteHeaderProps = {
  activePath: string;
};

export function SiteHeader({ activePath }: SiteHeaderProps) {
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
            <span>公开预测账本 · 错误也留痕</span>
          </div>
        </a>
        <button
          aria-controls="site-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "收起导航菜单" : "展开导航菜单"}
          className="nav-toggle"
          onClick={() => setMenuOpen((current) => !current)}
          type="button"
        >
          {menuOpen ? <X aria-hidden="true" size={18} /> : <Menu aria-hidden="true" size={18} />}
        </button>
      </div>

      <nav
        aria-label="Site navigation"
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
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
