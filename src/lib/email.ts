import { google } from 'googleapis'
import { prisma } from './prisma'
import { compileTemplate, addTrackingPixel, addUnsubscribeFooter, rewriteLinks } from './templates'
import { generateTrackingId, generateTrackingSignature, generateLinkHash } from './utils'
import { redis } from './redis'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  emailAccountId: string
  leadId?: string
  campaignId?: string
  stepId?: string
}

export async function sendEmail(options: EmailOptions) {
  const { to, subject, html, emailAccountId, leadId, campaignId, stepId } = options

  // Get email account
  const emailAccount = await prisma.emailAccount.findUnique({
    where: { id: emailAccountId },
  })

  if (!emailAccount) {
    throw new Error('Email account not found')
  }

  if (!emailAccount.isActive) {
    throw new Error('Email account is not active')
  }

  // Set up Gmail API
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GMAIL_OAUTH_REDIRECT
  )

  oauth2Client.setCredentials({
    access_token: emailAccount.accessToken,
    refresh_token: emailAccount.refreshToken,
    expiry_date: emailAccount.expiresAt?.getTime(),
  })

  // Refresh token if needed
  if (emailAccount.expiresAt && emailAccount.expiresAt < new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken()
    
    await prisma.emailAccount.update({
      where: { id: emailAccountId },
      data: {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || emailAccount.refreshToken,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      },
    })

    oauth2Client.setCredentials(credentials)
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  // Generate tracking data
  const trackingId = generateTrackingId()
  const trackingSignature = generateTrackingSignature(trackingId, leadId || '', process.env.JWT_SECRET!)
  const trackingUrl = `${process.env.APP_URL}/api/track/open?id=${trackingId}&sig=${trackingSignature}`

  // Store tracking data in Redis
  await redis.setex(`tracking:${trackingId}`, 86400, JSON.stringify({
    leadId,
    campaignId,
    stepId,
  }))

  // Process email content
  let processedHtml = html

  // Add tracking pixel
  processedHtml = addTrackingPixel(processedHtml, trackingUrl)

  // Add unsubscribe footer
  const unsubscribeUrl = `${process.env.APP_URL}/unsubscribe?token=${generateTrackingId()}`
  processedHtml = addUnsubscribeFooter(processedHtml, unsubscribeUrl)

  // Rewrite links for tracking
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi
  const linkMap: { [originalUrl: string]: string } = {}
  let match

  while ((match = linkRegex.exec(processedHtml)) !== null) {
    const originalUrl = match[1]
    const hash = generateLinkHash(originalUrl)
    const trackingUrl = `${process.env.APP_URL}/r/${hash}`
    linkMap[originalUrl] = trackingUrl

    // Store link mapping in Redis
    await redis.setex(`link:${hash}`, 86400, JSON.stringify({
      originalUrl,
      leadId,
      campaignId,
      stepId,
    }))
  }

  processedHtml = rewriteLinks(processedHtml, linkMap)

  // Create MIME message
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    processedHtml,
  ].join('\n')

  const encodedMessage = Buffer.from(message).toString('base64url')

  // Send email
  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  })

  // Record activity
  if (leadId && campaignId) {
    await prisma.activity.create({
      data: {
        leadId,
        campaignId,
        stepId,
        type: 'SENT' as const,
        metadata: {
          messageId: response.data.id,
          to,
          subject,
          timestamp: new Date(),
        },
      },
    })
  }

  return response.data
}

export async function checkBounces(emailAccountId: string) {
  const emailAccount = await prisma.emailAccount.findUnique({
    where: { id: emailAccountId },
  })

  if (!emailAccount || !emailAccount.isActive) {
    return
  }

  // Set up Gmail API
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GMAIL_OAUTH_REDIRECT
  )

  oauth2Client.setCredentials({
    access_token: emailAccount.accessToken,
    refresh_token: emailAccount.refreshToken,
    expiry_date: emailAccount.expiresAt?.getTime(),
  })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  try {
    // Search for bounce messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread subject:(bounced|undelivered|delivery failed|returned mail)',
      maxResults: 10,
    })

    if (!response.data.messages) {
      return
    }

    for (const message of response.data.messages) {
      const messageData = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
      })

      const headers = messageData.data.payload?.headers || []
      const subject = headers.find(h => h.name === 'Subject')?.value || ''
      const from = headers.find(h => h.name === 'From')?.value || ''

      // Extract email from bounce message (basic implementation)
      const emailMatch = from.match(/<([^>]+)>/) || from.match(/([^\s]+@[^\s]+)/)
      const bouncedEmail = emailMatch ? emailMatch[1] : null

      if (bouncedEmail) {
        // Mark lead as bounced
        await prisma.lead.updateMany({
          where: {
            email: bouncedEmail,
            userId: emailAccount.userId,
          },
          data: {
            bounced: true,
          },
        })

        // Record bounce activity
        const lead = await prisma.lead.findFirst({
          where: {
            email: bouncedEmail,
            userId: emailAccount.userId,
          },
        })

        if (lead) {
          await prisma.activity.create({
            data: {
              leadId: lead.id,
              campaignId: '', // Empty for bounce detection
              type: 'BOUNCE' as const,
              metadata: {
                bounceMessage: subject,
                timestamp: new Date(),
              },
            },
          })
        }
      }
    }
  } catch (error) {
    console.error('Bounce check error:', error)
  }
}
