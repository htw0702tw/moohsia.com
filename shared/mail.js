import { CONTACT_EMAIL } from "./brand.js";

/**
 * Resend HTTPS API. Works from Workers. The key stays in RESEND_API_KEY.
 * @param {Record<string, unknown>} env
 * @param {{ to: string, subject: string, text: string }} message
 */
export async function sendMail(env, message) {
  const key = typeof env?.RESEND_API_KEY === "string" ? env.RESEND_API_KEY.trim() : "";
  if (key.length < 8) return { ok: false, code: "mail_not_configured" };
  const from = typeof env?.MAIL_FROM === "string" && env.MAIL_FROM.trim() ? env.MAIL_FROM.trim() : `MOOHSIA <${CONTACT_EMAIL}>`;
  const fetchImpl = typeof env?.MAIL_FETCH === "function" ? env.MAIL_FETCH : fetch;
  try {
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject.slice(0, 180),
        text: message.text.slice(0, 12000),
      }),
    });
    if (!response.ok) {
      try {
        await response.body?.cancel();
      } catch {
        /* ignore */
      }
      return { ok: false, code: "mail_failed" };
    }
    try {
      await response.body?.cancel();
    } catch {
      /* ignore */
    }
    return { ok: true };
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    if (name) return { ok: false, code: "mail_failed" };
    return { ok: false, code: "mail_failed" };
  }
}

export function ownerInbox(env) {
  const configured = typeof env?.APPLICATIONS_TO === "string" ? env.APPLICATIONS_TO.trim() : "";
  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(configured)) return configured;
  return CONTACT_EMAIL;
}
