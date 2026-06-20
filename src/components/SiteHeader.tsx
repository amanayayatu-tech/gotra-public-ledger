import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const navItems = [
  { href: "#full-ledger", label: "账本" },
  { href: "#how-it-works", label: "工作原理" },
  { href: "#method-boundary", label: "方法与边界" },
  { href: "#subscribe", label: "订阅" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState(navItems[0].href);

  useEffect(() => {
    const sections = navItems
      .map((item) => document.querySelector<HTMLElement>(item.href))
      .filter((section): section is HTMLElement => section !== null);

    const updateActiveSection = () => {
      const headerOffset = 104;
      const currentSection = sections
        .slice()
        .sort((left, right) => left.offsetTop - right.offsetTop)
        .reduce((current, section) => {
          const top = section.getBoundingClientRect().top;
          return top <= headerOffset ? section : current;
        }, sections[0]);

      if (currentSection?.id) {
        setActiveHref(`#${currentSection.id}`);
      }
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-main">
        <a className="brand" href="#" onClick={() => setMenuOpen(false)}>
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
        className={`topbar-meta ${menuOpen ? "open" : ""}`}
        id="site-navigation"
      >
        {navItems.map((item) => (
          <a
            aria-current={activeHref === item.href ? "page" : undefined}
            className={activeHref === item.href ? "active" : ""}
            href={item.href}
            key={item.href}
            onClick={() => {
              setActiveHref(item.href);
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
