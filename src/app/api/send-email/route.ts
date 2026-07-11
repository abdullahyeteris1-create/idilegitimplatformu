import { NextResponse } from "next/server";
import { Resend } from "resend";

type SendEmailBody = {
  to?: unknown;
  subject?: unknown;
  html?: unknown;
};

const SERVICE_ERROR_MESSAGE = "E-posta servisi şu anda kullanılamıyor.";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "to, subject ve html alanları zorunludur." },
      { status: 400 },
    );
  }

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return NextResponse.json(
      { ok: false, message: "to, subject ve html alanları zorunludur." },
      { status: 400 },
    );
  }

  const body = payload as SendEmailBody;
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const html = typeof body.html === "string" ? body.html : "";

  if (!to || !subject || !html.trim()) {
    return NextResponse.json(
      { ok: false, message: "to, subject ve html alanları zorunludur." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    return NextResponse.json(
      { ok: false, message: SERVICE_ERROR_MESSAGE },
      { status: 500 },
    );
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error || !data?.id) {
      return NextResponse.json(
        { ok: false, message: SERVICE_ERROR_MESSAGE },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch {
    return NextResponse.json(
      { ok: false, message: SERVICE_ERROR_MESSAGE },
      { status: 500 },
    );
  }
}
