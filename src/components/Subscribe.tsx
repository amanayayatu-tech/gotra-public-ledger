import { FormEvent, useId, useState } from "react";
import { ArrowUpRight, CheckCircle2, FileText, Mail, ShieldCheck, Users } from "lucide-react";

const notesUrl = "#/notes";
const sourcesUrl = "#/sources";

type SubmitState = "idle" | "submitting" | "success" | "error";

function emitSubscribeSubmit() {
  window.dispatchEvent(new CustomEvent("subscribe_submit", { detail: { channel: "email" } }));
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function Subscribe() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("Local CTA only. No mailing-list backend or production write.");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextEmail = email.trim();

    if (!isValidEmail(nextEmail)) {
      setState("error");
      setMessage("请输入有效邮箱地址。");
      return;
    }

    emitSubscribeSubmit();
    setState("submitting");
    setMessage("Local demo event emitted. No external mailing-list write.");

    window.setTimeout(() => {
      if (nextEmail.toLowerCase().includes("fail")) {
        setState("error");
        setMessage("Local demo validation failed. No external service was called.");
        return;
      }

      setState("success");
      setMessage("Local CTA complete. No email was stored and no production integration was called.");
      setEmail("");
    }, 450);
  };

  return (
    <section className="subscribe-section" id="subscribe" aria-labelledby="subscribe-title">
      <div className="subscribe-layout">
        <div className="subscribe-copy">
          <span className="section-index">S6.5 · Subscribe</span>
          <h2 id="subscribe-title">关注公开账本更新</h2>
          <p>
            获取 GOTRA Public Ledger 的 research notes、error reviews 与账本变更提醒。
            This CTA is local/static only and does not write to a mailing-list backend.
          </p>
          <div className="subscribe-boundary">
            <ShieldCheck aria-hidden="true" size={16} />
            Research information only · Not investment advice · Not a trading signal
          </div>
        </div>

        <form className="subscribe-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor={emailId}>邮箱</label>
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
                  setMessage("Local CTA only. No mailing-list backend or production write.");
                }
              }}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </div>
          <button disabled={state === "submitting"} type="submit">
            {state === "submitting" ? "提交中..." : "订阅邮件更新"}
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
            Notes / Reports
            <small>查看 public-safe notes、错误复盘和透明度更新</small>
          </span>
          <ArrowUpRight aria-hidden="true" size={16} />
        </a>
      </div>

      <div className="premium-panel" aria-labelledby="premium-title">
        <div className="premium-heading">
          <Users aria-hidden="true" size={18} />
          <div>
            <h3 id="premium-title">Content operations</h3>
            <p>当前只提供 local/static CTA；没有真实邮件、社群、支付或生产写入集成。</p>
          </div>
        </div>
        <div className="premium-table-wrap">
          <table className="premium-table">
            <thead>
              <tr>
                <th>权益</th>
                <th>免费</th>
                <th>Later</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>公开账本浏览</td>
                <td>
                  <CheckCircle2 aria-hidden="true" size={14} />
                  全量 demo
                </td>
                <td>
                  <CheckCircle2 aria-hidden="true" size={14} />
                  可审查的更新提醒方案
                </td>
              </tr>
              <tr>
                <td>错误复盘摘要</td>
                <td>月度公开摘要</td>
                <td>需独立审批后再接外部服务</td>
              </tr>
              <tr>
                <td>可下载审计材料</td>
                <td>公开文档</td>
                <td>仍需 public export gate</td>
              </tr>
              <tr>
                <td>价格</td>
                <td>免费</td>
                <td>未启用</td>
              </tr>
            </tbody>
          </table>
        </div>
        <a className="premium-cta" href={sourcesUrl}>
          查看 Sources / manifest
          <ArrowUpRight aria-hidden="true" size={16} />
        </a>
      </div>
    </section>
  );
}
