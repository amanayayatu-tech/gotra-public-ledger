import { FormEvent, useId, useState } from "react";
import { ArrowUpRight, CheckCircle2, Github, Mail, ShieldCheck, Users } from "lucide-react";

const communityUrl = "https://github.com/amanayayatu-tech/gotra-public-ledger";
const premiumUrl = "https://github.com/sponsors/amanayayatu-tech";

type SubmitState = "idle" | "submitting" | "success" | "error";

function emitSubscribeSubmit() {
  window.dispatchEvent(new CustomEvent("subscribe_submit", { detail: { channel: "email" } }));
}

function emitPremiumClick() {
  window.dispatchEvent(new CustomEvent("cta_click", { detail: { target: "premium" } }));
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function Subscribe() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("每周一次接收 public-safe demo 更新摘要。");

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
    setMessage("正在提交订阅请求...");

    window.setTimeout(() => {
      if (nextEmail.toLowerCase().includes("fail")) {
        setState("error");
        setMessage("演示提交失败：请稍后重试或通过 GitHub 关注更新。");
        return;
      }

      setState("success");
      setMessage("订阅已记录在本地演示流程中；正式投递需接入外部邮件服务。");
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
            获取 GOTRA Public Ledger 的研究信息更新、错误复盘与账本变更提醒。
            本区块只提供研究信息，非投资建议。
          </p>
          <div className="subscribe-boundary">
            <ShieldCheck aria-hidden="true" size={16} />
            研究信息 · 非投资建议 · public-safe demo
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
                  setMessage("每周一次接收 public-safe demo 更新摘要。");
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
        <a className="community-link" href={communityUrl} target="_blank" rel="noreferrer">
          <Github aria-hidden="true" size={18} />
          <span>
            GitHub 关注 / 社群入口
            <small>查看公开 issue、提交反馈、追踪账本变更</small>
          </span>
          <ArrowUpRight aria-hidden="true" size={16} />
        </a>
      </div>

      <div className="premium-panel" aria-labelledby="premium-title">
        <div className="premium-heading">
          <Users aria-hidden="true" size={18} />
          <div>
            <h3 id="premium-title">免费 vs Premium</h3>
            <p>Premium 是产品路线占位，引导到外部平台页；不在前端仓库保存支付密钥。</p>
          </div>
        </div>
        <div className="premium-table-wrap">
          <table className="premium-table">
            <thead>
              <tr>
                <th>权益</th>
                <th>免费</th>
                <th>Premium</th>
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
                  全量 demo + 更新提醒
                </td>
              </tr>
              <tr>
                <td>错误复盘摘要</td>
                <td>月度公开摘要</td>
                <td>每周结构化摘要</td>
              </tr>
              <tr>
                <td>可下载审计材料</td>
                <td>公开文档</td>
                <td>优先打包与变更提醒</td>
              </tr>
              <tr>
                <td>价格</td>
                <td>免费</td>
                <td>$9 / 月，占位价格</td>
              </tr>
            </tbody>
          </table>
        </div>
        <a className="premium-cta" href={premiumUrl} target="_blank" rel="noreferrer" onClick={emitPremiumClick}>
          查看 Premium 平台页
          <ArrowUpRight aria-hidden="true" size={16} />
        </a>
      </div>
    </section>
  );
}
