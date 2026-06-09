type SendPasswordResetEmailInput = {
  to: string
  code: string
}

const RESEND_API_URL = "https://api.resend.com/emails"

export async function sendPasswordResetEmail({ to, code }: SendPasswordResetEmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error("Missing env var: RESEND_API_KEY")
  }

  const from = process.env.PASSWORD_RESET_FROM_EMAIL || "onboarding@resend.dev"

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Codigo de recuperacao de senha - EduConnect",
      html: passwordResetHtml(code),
      text: passwordResetText(code),
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(`Resend failed with ${response.status}: ${detail}`)
  }
}

function passwordResetText(code: string) {
  return [
    "Codigo de recuperacao de senha - EduConnect",
    "",
    `Seu codigo de recuperacao e: ${code}`,
    "",
    "Ele expira em 24 horas e pode ser usado apenas uma vez.",
    "Se voce nao solicitou essa recuperacao, ignore este email.",
  ].join("\n")
}

function passwordResetHtml(code: string) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h1 style="font-size: 22px; margin: 0 0 12px;">Recuperacao de senha</h1>
      <p style="margin: 0 0 16px;">Use o codigo abaixo para redefinir sua senha no EduConnect.</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1D4ED8; margin: 24px 0;">
        ${code}
      </div>
      <p style="margin: 0 0 8px;">Este codigo expira em 24 horas e pode ser usado apenas uma vez.</p>
      <p style="margin: 0; color: #6B7280;">Se voce nao solicitou essa recuperacao, ignore este email.</p>
    </div>
  `
}
