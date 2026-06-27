import { ArrowDown, BrainCircuit, CalendarCheck2, FileClock, Microscope, PenLine } from "lucide-react";
import type { Language } from "../i18n/language";
import { copy } from "../i18n/language";

const steps = [
  {
    title: "每日研究",
    text: "系统按固定股票池形成当天判断，而不是事后挑案例。",
    icon: Microscope,
    href: "#ledger-proof",
  },
  {
    title: "公开记录",
    text: "预测方向、幅度、置信度和证据链带时间戳写入账本。",
    icon: PenLine,
    href: "#full-ledger",
  },
  {
    title: "到期对照",
    text: "窗口到期后，与真实市场走势逐条比对。",
    icon: CalendarCheck2,
    href: "#ledger-proof",
  },
  {
    title: "错误归因",
    text: "判对判错、误差多少、错在方向还是幅度都公开。",
    icon: FileClock,
    href: "#trust-strip",
  },
  {
    title: "认知更新",
    text: "同一标的的后续判断继续在同一账本留痕，形成可追溯的持续迭代。",
    icon: BrainCircuit,
    href: "#method-boundary",
  },
];

const englishStepCopy: Record<string, { title: string; text: string }> = {
  每日研究: {
    title: "Daily research",
    text: "The system forms daily judgments from a fixed universe instead of cherry-picking later.",
  },
  公开记录: {
    title: "Public record",
    text: "Direction, magnitude, confidence, and evidence chain are written before outcomes are known.",
  },
  到期对照: {
    title: "Expiry comparison",
    text: "After the window expires, records are compared with actual market movement one by one.",
  },
  错误归因: {
    title: "Error attribution",
    text: "Correctness, error size, direction misses, and magnitude misses remain visible.",
  },
  认知更新: {
    title: "Cognition update",
    text: "Later work on the same target stays linked in the same ledger for traceable iteration.",
  },
};

export function HowItWorks({ language }: { language: Language }) {
  return (
    <section className="story-section" id="how-it-works" aria-labelledby="how-title">
      <div className="section-heading">
        <span>{copy(language, "S2 · 工作机制", "S2 · How it works")}</span>
        <h2 id="how-title">{copy(language, "我们的工作机制", "How the system works")}</h2>
        <p>{copy(language, "事前留痕 vs 事后解释：GOTRA 把研究、记录、对照、归因和后续更新放在同一条公开链路里。", "Prior record vs after-the-fact explanation: GOTRA keeps research, records, comparison, attribution, and updates in one public chain.")}</p>
      </div>

      <ol className="workflow-list">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title}>
              <a href={step.href}>
                <span className="workflow-index">{index + 1}</span>
                <span className="workflow-icon" aria-hidden="true">
                  <Icon size={22} />
                </span>
                <strong>{language === "zh" ? step.title : englishStepCopy[step.title].title}</strong>
                <small>{language === "zh" ? step.text : englishStepCopy[step.title].text}</small>
              </a>
              {index < steps.length - 1 ? <ArrowDown className="workflow-arrow" aria-hidden="true" size={18} /> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
