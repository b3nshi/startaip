import nodemailer from "nodemailer";
import { createClient } from "@/lib/supabase/server";

/** Notify every partner. Never throws: a failed email must not fail the action. */
export async function notifyPartners(subject: string, lines: string[]) {
  try {
    const supabase = await createClient();
    const { data: partners } = await supabase.from("partners").select("email");
    const to = (partners ?? []).map((p) => p.email);
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
    console.error("notifyPartners failed", e);
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
