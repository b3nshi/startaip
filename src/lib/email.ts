import nodemailer from "nodemailer";

/** Send a simple HTML email over SMTP. Never throws: a failed email must not fail the action. */
export async function sendMail(to: string[], subject: string, lines: string[]) {
  try {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
      console.log(`[email skipped: SMTP_* / EMAIL_FROM not set] ${subject}`);
      return;
    }
    if (!to.length) return;
    const html = `<div style="font-family:sans-serif;font-size:15px;line-height:1.5"><h3>${esc(subject)}</h3>${lines
      .map((l) => `<p style="margin:4px 0">${esc(l)}</p>`)
      .join("")}</div>`;
    const port = Number(SMTP_PORT ?? 465);
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465, // implicit TLS on 465, STARTTLS on 587
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transport.sendMail({ from: EMAIL_FROM, to, subject, html });
  } catch (e) {
    console.error("sendMail failed", e);
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
