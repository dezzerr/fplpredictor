import { runFplDataHealthCheck } from '../../lib/fplHealth'

const SENDER_ENDPOINT = 'https://api.sender.net/v2/message/send'

function appBaseUrl(): string {
  const url = process.env.FPL_HEALTH_APP_URL
  if (!url) throw new Error('FPL_HEALTH_APP_URL is required')
  return url
}

async function sendFailureAlert(result: Awaited<ReturnType<typeof runFplDataHealthCheck>>) {
  const recipient = process.env.FPL_HEALTH_ALERT_EMAIL
  const token = process.env.SENDER_API_TOKEN
  const fromEmail = process.env.SENDER_FROM_EMAIL
  if (!recipient || !token || !fromEmail) {
    console.error('[FPL health] Alert not sent: FPL_HEALTH_ALERT_EMAIL or Sender credentials are missing')
    return
  }

  const fromName = process.env.SENDER_FROM_NAME || 'FPL Companion'
  const details = result.checks.map((check) => `• ${check}`).join('\n')
  const response = await fetch(SENDER_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: { email: fromEmail, name: fromName },
      to: { email: recipient },
      subject: '[FPL Companion] Daily FPL data health check failed',
      text: `The daily FPL data health check failed.\n\nChecked: ${result.checkedAt}\nSeason: ${result.seasonKey ?? 'unavailable'}\n\n${details}`,
    }),
  })
  if (!response.ok) throw new Error(`Sender returned HTTP ${response.status}`)
}

export default async (): Promise<Response> => {
  // Netlify's built-in URL variables can point at the primary site from a
  // preview. Only the production deployment receives this explicit setting.
  if (!process.env.FPL_HEALTH_APP_URL) {
    return Response.json({ skipped: true, reason: 'FPL_HEALTH_APP_URL is not configured for this deployment' })
  }

  const result = await runFplDataHealthCheck({ appBaseUrl: appBaseUrl() })
  if (result.ok) {
    console.log(`[FPL health] OK season=${result.seasonKey} checkedAt=${result.checkedAt}`)
    return Response.json(result)
  }

  console.error('[FPL health] Failed:', result)
  try {
    await sendFailureAlert(result)
  } catch (error) {
    console.error('[FPL health] Alert delivery failed:', error)
  }
  return Response.json(result, { status: 500 })
}
