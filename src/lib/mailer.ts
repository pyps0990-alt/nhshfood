import nodemailer from "nodemailer";

/**
 * Gmail transporter for sending order notifications.
 *
 * Required env vars:
 *   GMAIL_USER     — Gmail address (e.g. school-cafeteria@school.edu.tw)
 *   GMAIL_APP_PWD  — Gmail App Password (16-char, not regular password)
 *
 * To set up:
 * 1. Enable 2FA on the Gmail account
 * 2. Go to https://myaccount.google.com/apppasswords
 * 3. Generate an app password for "Mail"
 * 4. Set GMAIL_APP_PWD in Vercel env vars
 */

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PWD;

  if (!user || !pass) {
    console.warn("GMAIL_USER or GMAIL_APP_PWD not set — email disabled");
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return transporter;
}

const statusLabels: Record<string, string> = {
  pending: "訂單已收到",
  confirmed: "準備中",
  ready: "可取餐",
  picked_up: "已取餐",
  cancelled: "已取消",
};

export async function sendOrderNotification(params: {
  to: string;
  studentName: string;
  orderNumber: string;
  status: string;
  department: string;
  items: { name: string; quantity: number; price: number }[];
  totalPrice: number;
}) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "mailer_not_configured" };

  const { to, studentName, orderNumber, status, department, items, totalPrice } = params;
  const displayNum = orderNumber.length > 6 ? orderNumber.slice(-4) : orderNumber;
  const deptLabel = department === "breakfast" ? "早餐部" : "午餐部";
  const statusLabel = statusLabels[status] || status;

  const subject = `【內湖高中熱食部】訂單 #${displayNum} ${statusLabel}`;

  const statusColor = status === "ready" ? "#059669" : status === "cancelled" ? "#dc2626" : status === "confirmed" ? "#2563eb" : "#E23D28";
  const statusSvg: Record<string, string> = {
    pending: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    confirmed: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/></svg>`,
    ready: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    cancelled: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  };
  const statusMessages: Record<string, string> = {
    pending: "我們已收到您的訂單",
    confirmed: "店家已確認，正在為您準備餐點",
    ready: "餐點已備妥，請盡快前往取餐",
    cancelled: "很抱歉，您的訂單已被取消",
  };
  const statusMsg = statusMessages[status] || "";

  const statusEmoji: Record<string, string> = {
    pending: "&#128337;",
    confirmed: "&#127859;",
    ready: "&#9989;",
    picked_up: "&#127860;",
    cancelled: "&#10060;",
  };

  const itemRows = items.map((i) =>
    `<tr>
      <td style="padding:8px 0;font-size:14px;color:#333;border-bottom:1px solid #f0f0f0">${i.name} x ${i.quantity}</td>
      <td style="padding:8px 0;font-size:14px;color:#333;text-align:right;font-weight:600;border-bottom:1px solid #f0f0f0">$${i.price * i.quantity}</td>
    </tr>`
  ).join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f5f0eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px">
        <tr><td align="center">
          <table width="400" cellpadding="0" cellspacing="0" style="max-width:400px;width:100%">
            <!-- Header -->
            <tr><td style="background:${statusColor};padding:32px 24px;border-radius:16px 16px 0 0;text-align:center">
              <div style="font-size:40px;margin-bottom:12px">${statusEmoji[status] || statusEmoji.pending}</div>
              <p style="margin:0;font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.02em">${statusLabel}</p>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85)">${statusMsg}</p>
            </td></tr>

            <!-- Order Number -->
            <tr><td style="background:#fff;padding:24px;text-align:center;border-left:1px solid #e5e5e5;border-right:1px solid #e5e5e5">
              <p style="margin:0;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.05em">${deptLabel}</p>
              <p style="margin:8px 0 0;font-size:40px;font-weight:900;color:#1a1a1a;letter-spacing:-0.02em">#${displayNum}</p>
            </td></tr>

            <!-- Items -->
            <tr><td style="background:#fff;padding:0 24px;border-left:1px solid #e5e5e5;border-right:1px solid #e5e5e5">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #f0f0f0">
                ${itemRows}
                <tr>
                  <td style="padding:12px 0 0;font-size:16px;font-weight:800;color:#1a1a1a">合計</td>
                  <td style="padding:12px 0 0;font-size:18px;font-weight:800;color:#E23D28;text-align:right">$${totalPrice}</td>
                </tr>
              </table>
            </td></tr>

            ${status === "ready" ? `
            <!-- Ready Banner -->
            <tr><td style="background:#fff;padding:16px 24px;border-left:1px solid #e5e5e5;border-right:1px solid #e5e5e5">
              <div style="background:#ecfdf5;border:2px solid #a7f3d0;border-radius:12px;padding:16px;text-align:center">
                <p style="margin:0;font-size:16px;font-weight:700;color:#059669">&#128205; 請至${deptLabel}取餐</p>
              </div>
            </td></tr>` : ""}

            <!-- Footer -->
            <tr><td style="background:#fafaf8;padding:20px 24px;border-radius:0 0 16px 16px;text-align:center;border:1px solid #e5e5e5;border-top:none">
              <p style="margin:0;font-size:11px;color:#bbb">內湖高中熱食部 · nhsh-food.vercel.app</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  try {
    await t.sendMail({
      from: `"內湖高中熱食部" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error("Email send error:", err);
    return { sent: false, reason: "send_failed" };
  }
}
