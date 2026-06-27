import { FormEvent, useId, useState } from "react";
import { ArrowUpRight, CheckCircle2, FileText, Mail, ShieldCheck, Users } from "lucide-react";
import type { Language } from "../i18n/language";
import { copy, shortBoundarySentence } from "../i18n/language";

const notesUrl = "#/notes";
const sourcesUrl = "#/sources";

type SubmitState = "idle" | "submitting" | "success" | "error";

function emitSubscribeSubmit() {
  window.dispatchEvent(new CustomEvent("subscribe_submit", { detail: { channel: "email" } }));
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function Subscribe({ language }: { language: Language }) {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState(copy(language, "本地静态提示控件。没有邮件列表后端或生产写入。", "Local CTA only. No mailing-list backend or production write."));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextEmail = email.trim();

    if (!isValidEmail(nextEmail)) {
      setState("error");
      setMessage(copy(language, "请输入有效邮箱地址。", "Enter a valid email address."));
      return;
    }

    emitSubscribeSubmit();
    setState("submitting");
    setMessage(copy(language, "已触发本地演示事件。没有外部邮件列表写入。", "Local demo event emitted. No external mailing-list write."));

    window.setTimeout(() => {
      if (nextEmail.toLowerCase().includes("fail")) {
        setState("error");
        setMessage(copy(language, "本地演示验证失败。没有调用外部服务。", "Local demo validation failed. No external service was called."));
        return;
      }

      setState("success");
      setMessage(copy(language, "本地静态提示完成。没有存储邮箱，也没有调用生产集成。", "Local CTA complete. No email was stored and no production integration was called."));
      setEmail("");
    }, 450);
  };

  return (
    <section className="subscribe-section" id="subscribe" aria-labelledby="subscribe-title">
      <div className="subscribe-layout">
        <div className="subscribe-copy">
          <span className="section-index">{copy(language, "S6.5 · 订阅提示", "S6.5 · Subscribe")}</span>
          <h2 id="subscribe-title">{copy(language, "关注公开账本更新", "Follow public ledger updates")}</h2>
          <p>
            {copy(language, "获取 GOTRA Public Ledger 的研究简报、错误复盘与账本变更提醒。此入口仅为本地静态控件，不写入邮件列表后端。", "Get GOTRA Public Ledger research notes, error reviews, and ledger-change alerts. This CTA is local/static only and does not write to a mailing-list backend.")}
          </p>
          <div className="subscribe-boundary">
            <ShieldCheck aria-hidden="true" size={16} />
            {shortBoundarySentence(language)}
          </div>
        </div>

        <form className="subscribe-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor={emailId}>{copy(language, "邮箱", "Email")}</label>
          <div className="subscribe-input-row">
            <Mail aria-hidden="true" size={17} />
            <input
              aria-describedby={`${emailId}-feedback`}
              autoComplete="email"
              id={emailId}
              inputMode="email"
              onChange={(event) => {
                setEmail(event.target.value);
                if (state !== "submitting") {
                  setState("idle");
                  setMessage(copy(language, "本地静态提示控件。没有邮件列表后端或生产写入。", "Local CTA only. No mailing-list backend or production write."));
                }
              }}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </div>
          <button disabled={state === "submitting"} type="submit">
            {state === "submitting" ? copy(language, "提交中...", "Submitting...") : copy(language, "订阅邮件更新", "Subscribe for updates")}
          </button>
          <p className={`subscribe-feedback ${state}`} id={`${emailId}-feedback`} role="status">
            {message}
          </p>
        </form>
      </div>

      <div className="subscribe-actions">
        <a className="community-link" href={notesUrl}>
          <FileText aria-hidden="true" size={18} />
          <span>
            {copy(language, "简报 / 报告", "Notes / Reports")}
            <small>{copy(language, "查看公开安全简报、错误复盘和透明度更新", "View public-safe notes, error reviews, and transparency updates")}</small>
          </span>
          <ArrowUpRight aria-hidden="true" size={16} />
        </a>
      </div>

      <div className="premium-panel" aria-labelledby="premium-title">
        <div className="premium-heading">
          <Users aria-hidden="true" size={18} />
          <div>
            <h3 id="premium-title">{copy(language, "内容运营", "Content operations")}</h3>
            <p>{copy(language, "当前只提供本地静态提示控件；没有真实邮件、社群、支付或生产写入集成。", "Only a local/static CTA is provided; no real email, community, payment, or production write integration is active.")}</p>
          </div>
        </div>
        <div className="premium-table-wrap">
          <table className="premium-table">
            <thead>
              <tr>
                <th>{copy(language, "项目", "Item")}</th>
                <th>{copy(language, "当前", "Current")}</th>
                <th>{copy(language, "后续", "Later")}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{copy(language, "公开账本浏览", "Public ledger browsing")}</td>
                <td>
                  <CheckCircle2 aria-hidden="true" size={14} />
                  {copy(language, "全量演示", "Full demo")}
                </td>
                <td>
                  <CheckCircle2 aria-hidden="true" size={14} />
                  {copy(language, "可审查的更新提醒方案", "Reviewable update-alert plan")}
                </td>
              </tr>
              <tr>
                <td>{copy(language, "错误复盘摘要", "Error review summaries")}</td>
                <td>{copy(language, "月度公开摘要", "Monthly public summary")}</td>
                <td>{copy(language, "需独立审批后再接外部服务", "External services need separate approval")}</td>
              </tr>
              <tr>
                <td>{copy(language, "可下载审计材料", "Downloadable audit material")}</td>
                <td>{copy(language, "公开文档", "Public docs")}</td>
                <td>{copy(language, "仍需公开导出门检查", "Still requires public export gate")}</td>
              </tr>
              <tr>
                <td>{copy(language, "价格", "Price")}</td>
                <td>{copy(language, "免费", "Free")}</td>
                <td>{copy(language, "未启用", "Not enabled")}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <a className="premium-cta" href={sourcesUrl}>
          {copy(language, "查看来源 / 清单", "View Sources / manifest")}
          <ArrowUpRight aria-hidden="true" size={16} />
        </a>
      </div>
    </section>
  );
}
