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
  pending: "📋 訂單已收到",
  confirmed: "準備中",
  ready: "✅ 可取餐",
  picked_up: "已取餐",
  cancelled: "❌ 已取消",
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

  const itemList = items
    .map((i) => `${i.name} × ${i.quantity}　$${i.price * i.quantity}`)
    .join("\n      ");

  const subject = `【內湖高中熱食部】訂單 #${displayNum} ${statusLabel}`;

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #E23D28, #FF6B35); color: white; padding: 24px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 18px;">內湖高中熱食部</h1>
        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 13px;">訂單通知</p>
      </div>
      <div style="background: #fff; border: 1px solid #e5e5e5; border-top: none; padding: 24px; border-radius: 0 0 16px 16px;">
        <p style="margin: 0 0 4px; color: #888; font-size: 13px;">取餐號碼</p>
        <p style="margin: 0 0 16px; font-size: 32px; font-weight: 900; color: #1a1a1a;">#${displayNum}</p>

        <div style="background: ${status === "ready" ? "#ecfdf5" : status === "cancelled" ? "#fef2f2" : "#eff6ff"};
             border: 1px solid ${status === "ready" ? "#a7f3d0" : status === "cancelled" ? "#fecaca" : "#bfdbfe"};
             padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; text-align: center;">
          <span style="font-weight: 700; color: ${status === "ready" ? "#059669" : status === "cancelled" ? "#dc2626" : "#2563eb"};">
            ${statusLabel}
          </span>
        </div>

        ${studentName ? `<p style="margin: 0 0 12px; font-size: 14px; color: #555;">同學你好，${studentName}！</p>` : ""}

        <table style="width: 100%; font-size: 13px; color: #555; margin-bottom: 12px;">
          <tr><td style="padding: 4px 0;">部門</td><td style="text-align: right; font-weight: 600;">${deptLabel}</td></tr>
        </table>

        <div style="background: #f9f9f9; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px; font-weight: 700; font-size: 14px;">訂單內容</p>
          <pre style="margin: 0; font-family: inherit; font-size: 13px; color: #555; white-space: pre-wrap;">${itemList}</pre>
          <div style="border-top: 1px solid #e5e5e5; margin-top: 12px; padding-top: 12px; font-weight: 700; font-size: 16px; text-align: right;">
            合計 $${totalPrice}
          </div>
        </div>

        ${status === "ready" ? `
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; text-align: center;">
          <p style="margin: 0; font-weight: 700; color: #059669; font-size: 16px;">🎉 餐點已備好！</p>
          <p style="margin: 8px 0 0; color: #047857; font-size: 13px;">請至${deptLabel}取餐</p>
        </div>
        ` : ""}

        <p style="margin: 24px 0 0; font-size: 11px; color: #aaa; text-align: center;">
          此為系統自動發送，請勿直接回覆
        </p>
      </div>
    </div>
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
