import { createClient } from '@supabase/supabase-js'

const SENDER_ENDPOINT = 'https://api.sender.net/v2/message/send'
const MAX_ATTEMPTS = 3

type EmailOutboxJob = {
  id: string
  recipient_email: string
  attempt_count: number
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function retryAt(attemptCount: number): string {
  const minutes = Math.min(2 ** attemptCount, 60)
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

function welcomeEmailHtml(siteUrl: string): string {
  const importUrl = `${siteUrl.replace(/\/$/, '')}/import`

  return `<!doctype html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      @media only screen and (max-width: 620px) {
        .email-shell { border-radius: 0 !important; }
        .email-outer { padding: 0 !important; }
        .hero { padding: 28px 24px 30px !important; }
        .content { padding-left: 24px !important; padding-right: 24px !important; }
        .hero-title { font-size: 34px !important; line-height: 1.14 !important; }
        .guide-number { width: 28px !important; }
        .guide-copy { padding-left: 12px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f4f5f8;color:#172033;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">Find your FPL Team ID and import your squad in under a minute.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0;padding:0;background:#f4f5f8">
      <tr>
        <td class="email-outer" align="center" style="padding:32px 16px">
          <table class="email-shell" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,0.10)">
            <tr>
              <td class="hero" style="padding:32px 40px 30px;background-color:#111426;background-image:radial-gradient(circle at 17% 18%,rgba(34,211,238,0.24) 0,rgba(34,211,238,0) 24%),radial-gradient(circle at 90% 78%,rgba(168,85,247,0.34) 0,rgba(168,85,247,0) 30%),linear-gradient(rgba(255,255,255,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.07) 1px,transparent 1px),linear-gradient(135deg,#10131f 0%,#211852 54%,#123d55 100%);background-size:auto,auto,24px 24px,24px 24px,auto;background-position:center">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#22d3ee);color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-0.5px">FPL</td>
                    <td style="padding-left:12px;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px">FPL Companion</td>
                  </tr>
                </table>
                <p style="margin:42px 0 0;color:#e9d5ff;font-size:15px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">Your edge starts now</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 0">
                  <tr>
                    <td class="hero-title" style="color:#ffffff !important;font-size:42px;font-weight:700;line-height:1.14;letter-spacing:-1.25px;mso-line-height-rule:exactly"><font color="#FFFFFF" style="color:#ffffff !important">Welcome to your<br>smarter FPL season.</font></td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="content" style="padding:36px 40px 12px">
                <p style="margin:0;color:#344054;font-size:17px;line-height:1.6">You are in. Start by importing your team, then use FPL Companion to plan ahead and make every gameweek count.</p>
              </td>
            </tr>
            <tr>
              <td class="content" style="padding:20px 40px 8px">
                <p style="margin:0 0 12px;color:#33206d;font-size:15px;font-weight:700">Import your squad in three quick steps</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #e8e7ff;border-radius:14px;background:#fafaff">
                  <tr>
                    <td style="padding:18px">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%">
                        <tr>
                          <td class="guide-number" width="34" valign="top" style="width:34px"><span style="display:inline-block;width:24px;height:24px;border-radius:12px;background:#7c3aed;color:#ffffff;font-size:12px;font-weight:700;line-height:24px;text-align:center">1</span></td>
                          <td class="guide-copy" style="padding-left:10px;color:#475467;font-size:14px;line-height:1.5"><strong style="display:block;color:#1d2939">Open your team on the official FPL site</strong>Go to the team you manage and look at its web address.</td>
                        </tr>
                        <tr><td colspan="2" style="height:16px"></td></tr>
                        <tr>
                          <td class="guide-number" width="34" valign="top" style="width:34px"><span style="display:inline-block;width:24px;height:24px;border-radius:12px;background:#8b5cf6;color:#ffffff;font-size:12px;font-weight:700;line-height:24px;text-align:center">2</span></td>
                          <td class="guide-copy" style="padding-left:10px;color:#475467;font-size:14px;line-height:1.5"><strong style="display:block;color:#1d2939">Copy the number in the address</strong>Your Team ID is the number that appears in your team’s URL.</td>
                        </tr>
                        <tr><td colspan="2" style="height:16px"></td></tr>
                        <tr>
                          <td class="guide-number" width="34" valign="top" style="width:34px"><span style="display:inline-block;width:24px;height:24px;border-radius:12px;background:#22b8cf;color:#ffffff;font-size:12px;font-weight:700;line-height:24px;text-align:center">3</span></td>
                          <td class="guide-copy" style="padding-left:10px;color:#475467;font-size:14px;line-height:1.5"><strong style="display:block;color:#1d2939">Paste it into FPL Companion</strong>We’ll import your current squad so you can start planning.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="content" align="center" style="padding:26px 40px 38px">
                <a href="${importUrl}" style="display:inline-block;padding:15px 24px;border-radius:10px;background:#7c3aed;color:#ffffff;font-size:16px;font-weight:700;line-height:1;text-decoration:none;box-shadow:0 6px 14px rgba(124,58,237,0.25)">Import my team&nbsp; →</a>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 40px;background:#f8fafc;border-top:1px solid #eaecf0">
                <p style="margin:0;color:#667085;font-size:12px;line-height:1.5;text-align:center">You are receiving this because you created an FPL Companion account.</p>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;color:#98a2b3;font-size:12px;line-height:1.5">FPL Companion · Your gameweek, clearer.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export default async (): Promise<Response> => {
  const supabaseUrl = requiredEnvironment('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY')
  const senderToken = requiredEnvironment('SENDER_API_TOKEN')
  const fromEmail = requiredEnvironment('SENDER_FROM_EMAIL')
  const fromName = process.env.SENDER_FROM_NAME || 'FPL Companion'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fplcompanion.co.uk'

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await supabase.rpc('claim_email_outbox_jobs', { p_limit: 20 })
  if (error) throw new Error(`Unable to claim welcome-email jobs: ${error.message}`)

  const jobs = (data ?? []) as EmailOutboxJob[]
  let sent = 0
  let failed = 0

  for (const job of jobs) {
    try {
      const response = await fetch(SENDER_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${senderToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: { email: fromEmail, name: fromName },
          to: { email: job.recipient_email },
          subject: 'Welcome to FPL Companion — your edge starts now',
          text: `Welcome to FPL Companion. Plan ahead, spot opportunities, and make every gameweek count. Import your FPL Team ID, then explore fixtures, player form, and transfer ideas. Get started at ${siteUrl}`,
          html: welcomeEmailHtml(siteUrl),
        }),
      })

      const responseBody = await response.text()
      if (!response.ok) throw new Error(`Sender returned ${response.status}: ${responseBody.slice(0, 500)}`)

      let providerMessageId: string | null = null
      try {
        providerMessageId = JSON.parse(responseBody).id ?? null
      } catch {
        // Sender accepted the message; an ID is optional for our audit record.
      }

      const { error: updateError } = await supabase
        .from('email_outbox')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          locked_at: null,
          last_error: null,
          provider_message_id: providerMessageId,
        })
        .eq('id', job.id)
        .eq('status', 'processing')

      if (updateError) throw new Error(`Unable to mark email sent: ${updateError.message}`)
      sent += 1
    } catch (sendError) {
      const lastError = sendError instanceof Error ? sendError.message.slice(0, 1_000) : 'Unknown Sender delivery error'
      const isFinalAttempt = job.attempt_count >= MAX_ATTEMPTS
      const { error: updateError } = await supabase
        .from('email_outbox')
        .update({
          status: isFinalAttempt ? 'failed' : 'pending',
          locked_at: null,
          available_at: isFinalAttempt ? new Date().toISOString() : retryAt(job.attempt_count),
          last_error: lastError,
        })
        .eq('id', job.id)
        .eq('status', 'processing')

      if (updateError) throw new Error(`Unable to record email failure: ${updateError.message}`)
      failed += 1
    }
  }

  console.log(`Welcome email run complete: ${sent} sent, ${failed} failed, ${jobs.length} claimed`)
  return new Response(JSON.stringify({ sent, failed, claimed: jobs.length }), { status: 200 })
}
