import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { isAdminSessionValid } from "@/lib/auth/adminSession";

type WelcomeEmailBody = {
  studentName: string;
  parentEmail: string;
  username: string;
  temporaryPassword: string;
};

const BODY_FIELDS = new Set([
  "studentName",
  "parentEmail",
  "username",
  "temporaryPassword",
]);

const FIELD_LIMITS = {
  studentName: 120,
  parentEmail: 254,
  username: 100,
  temporaryPassword: 256,
} as const;

const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const SUBJECT = "İdil Hızlı Okuma – Öğrenci Giriş Bilgileri";
const LOGIN_URL = "https://panel.idilegitim.com";
const INVALID_REQUEST_MESSAGE =
  "Geçersiz istek. Öğrenci ve veli bilgilerini kontrol edin.";
const SERVICE_ERROR_MESSAGE =
  "E-posta şu anda gönderilemedi. Lütfen daha sonra tekrar deneyin.";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(
  body: Record<string, unknown>,
  field: keyof WelcomeEmailBody,
): string | null {
  const value = body[field];

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  if (
    !normalizedValue ||
    normalizedValue.length > FIELD_LIMITS[field] ||
    CONTROL_CHARACTER_PATTERN.test(normalizedValue)
  ) {
    return null;
  }

  return normalizedValue;
}

function isValidEmail(value: string): boolean {
  const [localPart] = value.split("@");

  return (
    value.length <= FIELD_LIMITS.parentEmail &&
    localPart.length <= 64 &&
    !localPart.startsWith(".") &&
    !localPart.endsWith(".") &&
    !localPart.includes("..") &&
    EMAIL_PATTERN.test(value)
  );
}

function parseWelcomeEmailBody(payload: unknown): WelcomeEmailBody | null {
  if (!isRecord(payload)) {
    return null;
  }

  const keys = Object.keys(payload);

  if (
    keys.length !== BODY_FIELDS.size ||
    keys.some((key) => !BODY_FIELDS.has(key))
  ) {
    return null;
  }

  const studentName = readRequiredString(payload, "studentName");
  const parentEmail = readRequiredString(payload, "parentEmail");
  const username = readRequiredString(payload, "username");
  const temporaryPassword = readRequiredString(payload, "temporaryPassword");

  if (
    !studentName ||
    !parentEmail ||
    !username ||
    !temporaryPassword ||
    !isValidEmail(parentEmail)
  ) {
    return null;
  }

  return {
    studentName,
    parentEmail,
    username,
    temporaryPassword,
  };
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

function createWelcomeEmailHtml(body: WelcomeEmailBody): string {
  const studentName = escapeHtml(body.studentName);
  const username = escapeHtml(body.username);
  const temporaryPassword = escapeHtml(body.temporaryPassword);

  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <title>${SUBJECT}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f8fafc; color:#172033; font-family:Arial, 'Helvetica Neue', sans-serif; -webkit-text-size-adjust:100%;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      ${studentName} için İDİL Hızlı Okuma hesap bilgileri hazır.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; border-collapse:collapse; background-color:#f8fafc;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; max-width:600px; border-collapse:separate; background-color:#ffffff; border:1px solid #fee2e2; border-radius:24px; overflow:hidden; box-shadow:0 16px 40px rgba(153,27,27,0.10);">
            <tr>
              <td style="padding:28px 24px; background-color:#b91c1c; background-image:linear-gradient(135deg,#991b1b 0%,#dc2626 58%,#ea580c 100%); color:#ffffff;">
                <p style="margin:0 0 8px; font-size:12px; line-height:18px; font-weight:700; letter-spacing:2px; text-transform:uppercase;">İDİL HIZLI OKUMA</p>
                <h1 style="margin:0; font-size:28px; line-height:36px; font-weight:800;">Aramıza hoş geldiniz!</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 8px;">
                <p style="margin:0 0 14px; font-size:18px; line-height:28px; font-weight:700; color:#172033;">Sayın Veli,</p>
                <p style="margin:0; font-size:16px; line-height:26px; color:#475569;">
                  <strong style="color:#172033;">${studentName}</strong> için öğrenci hesabı oluşturuldu. Platforma giriş yapmak için aşağıdaki bilgileri kullanabilirsiniz.
                </p>
                <p style="margin:12px 0 0; font-size:14px; line-height:22px; color:#64748b;">
                  Panel adresi: <a href="${LOGIN_URL}" target="_blank" style="color:#b91c1c; font-weight:700; text-decoration:underline;">https://panel.idilegitim.com</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; border-collapse:separate; background-color:#fff7ed; border:1px solid #fed7aa; border-radius:16px;">
                  <tr>
                    <td style="padding:18px 18px 8px; font-size:13px; line-height:20px; font-weight:700; color:#9a3412;">Kullanıcı adı</td>
                  </tr>
                  <tr>
                    <td style="padding:0 18px 18px; font-size:17px; line-height:26px; font-weight:700; color:#172033; word-break:break-word;">${username}</td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; margin-top:12px; border-collapse:separate; background-color:#fff7ed; border:1px solid #fed7aa; border-radius:16px;">
                  <tr>
                    <td style="padding:18px 18px 8px; font-size:13px; line-height:20px; font-weight:700; color:#9a3412;">Geçici şifre</td>
                  </tr>
                  <tr>
                    <td style="padding:0 18px 18px; font-size:17px; line-height:26px; font-weight:700; color:#172033; word-break:break-word;">${temporaryPassword}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 24px 24px;">
                <a href="${LOGIN_URL}" target="_blank" style="display:block; width:auto; padding:15px 20px; border-radius:12px; background-color:#b91c1c; color:#ffffff; font-size:16px; line-height:22px; font-weight:700; text-align:center; text-decoration:none;">Öğrenci Paneline Git</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 28px;">
                <p style="margin:0; font-size:13px; line-height:21px; color:#64748b;">
                  Güvenliğiniz için kullanıcı adı ve geçici şifreyi kimseyle paylaşmayın.
                </p>
                <p style="margin:18px 0 0; font-size:14px; line-height:22px; font-weight:700; color:#172033;">İdil Eğitim</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function serviceErrorResponse() {
  return NextResponse.json(
    { ok: false, message: SERVICE_ERROR_MESSAGE },
    { status: 500 },
  );
}

export async function POST(request: NextRequest) {
  if (!isAdminSessionValid(request)) {
    return NextResponse.json(
      { ok: false, message: "Yetkisiz erişim." },
      { status: 401 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: INVALID_REQUEST_MESSAGE },
      { status: 400 },
    );
  }

  const body = parseWelcomeEmailBody(payload);

  if (!body) {
    return NextResponse.json(
      { ok: false, message: INVALID_REQUEST_MESSAGE },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() || process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    return serviceErrorResponse();
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: body.parentEmail,
      subject: SUBJECT,
      html: createWelcomeEmailHtml(body),
    });

    if (result.error || !result.data?.id) {
      return serviceErrorResponse();
    }

    return NextResponse.json({ ok: true, id: result.data.id });
  } catch {
    return serviceErrorResponse();
  }
}
