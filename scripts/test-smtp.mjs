// Checks the SMTP settings in .env.local by logging in (sends nothing). Usage: npm run smtp:test [recipient] to also send a test mail.
import nodemailer from "nodemailer";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/);
  if (m && !line.trim().startsWith("#")) process.env[m[1]] ??= m[2];
}
const { SMTP_HOST, SMTP_PORT = "465", SMTP_USER, SMTP_PASS, SMTP_ADMIN_EMAIL, EMAIL_FROM } = process.env;
console.log({ SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS: SMTP_PASS ? "(set)" : "(MISSING)", SMTP_ADMIN_EMAIL, EMAIL_FROM });

const t = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT), secure: Number(SMTP_PORT) === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
try {
  await t.verify();
  console.log("OK: connected and authenticated");
  const to = process.argv[2];
  if (to) {
    await t.sendMail({ from: SMTP_ADMIN_EMAIL ?? EMAIL_FROM, to, subject: "SMTP test", text: "It works." });
    console.log("OK: test email sent to", to);
  }
} catch (e) {
  console.error("FAILED:", e.message);
  process.exit(1);
}
