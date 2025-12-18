import nodemailer from "nodemailer";

type SendEmailVerificationParams = {
  to: string;
  name?: string | null;
  verificationUrl: string;
};

function getEmailFrom() {
  return process.env.EMAIL_FROM || process.env.SMTP_USER || "";
}

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;

  if (!host) return null;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (user && !pass) {
    throw new Error("SMTP_PASS is required when SMTP_USER is set");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    ...(user
      ? {
          auth: {
            user,
            pass: pass!,
          },
        }
      : {}),
  });
}

export async function sendEmailVerification({
  to,
  name,
  verificationUrl,
}: SendEmailVerificationParams) {
  const from = getEmailFrom();
  const transport = getTransport();

  const subject = "EV Charge - E-posta dogrulama";
  const safeName = name?.trim() ? ` ${name.trim()}` : "";

  const text = `Merhaba${safeName},

Hesabini aktif etmek icin asagidaki baglantiya tikla:
${verificationUrl}

Eger bu istegi sen yapmadiysan bu e-postayi yok sayabilirsin.`;

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">EV Charge - E-posta dogrulama</h2>
      <p style="margin: 0 0 16px;">Merhaba${safeName},</p>
      <p style="margin: 0 0 16px;">Hesabini aktif etmek icin asagidaki butona tikla:</p>
      <p style="margin: 0 0 20px;">
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 14px; background: #10b981; color: #ffffff; border-radius: 8px; text-decoration: none;">
          E-postami dogrula
        </a>
      </p>
      <p style="margin: 0 0 10px; color: #4b5563; font-size: 14px;">Buton calismazsa bu baglantiyi tarayicina yapistir:</p>
      <p style="margin: 0; font-size: 14px; word-break: break-all;">
        <a href="${verificationUrl}">${verificationUrl}</a>
      </p>
    </div>
  `.trim();

  if (!transport || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[email] SMTP not configured. Verification URL:", verificationUrl);
      return;
    }
    throw new Error("Email transport is not configured (missing SMTP_HOST/EMAIL_FROM).");
  }

  await transport.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

