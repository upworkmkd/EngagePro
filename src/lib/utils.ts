// Note: clsx and tailwind-merge would need to be installed
// For now, using a simple implementation
import crypto from 'crypto'

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function generateTrackingId(): string {
  return crypto.randomBytes(16).toString('hex')
}

export function generateTrackingSignature(
  trackingId: string,
  leadId: string,
  secret: string
): string {
  const payload = `${trackingId}:${leadId}`
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

export function verifyTrackingSignature(
  trackingId: string,
  leadId: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateTrackingSignature(trackingId, leadId, secret)
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}

export function generateLinkHash(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex')
}

export function randomDelay(minMinutes: number, maxMinutes: number): number {
  const minMs = minMinutes * 60 * 1000
  const maxMs = maxMinutes * 60 * 1000
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function extractDomainFromEmail(email: string): string | null {
  const match = email.match(/@(.+)$/)
  return match ? match[1] : null
}

export function guessEmailVariations(domain: string, name: string): string[] {
  const variations: string[] = []
  
  // Split name into parts
  const nameParts = name.toLowerCase().split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts[nameParts.length - 1]
  
  if (firstName && lastName) {
    variations.push(`${firstName}.${lastName}@${domain}`)
    variations.push(`${firstName}${lastName}@${domain}`)
    variations.push(`${firstName.charAt(0)}${lastName}@${domain}`)
    variations.push(`${firstName}${lastName.charAt(0)}@${domain}`)
  }
  
  // Common business emails
  variations.push(`info@${domain}`)
  variations.push(`contact@${domain}`)
  variations.push(`hello@${domain}`)
  variations.push(`support@${domain}`)
  
  return variations
}

export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - in production, use a proper library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function calculateCTR(clicks: number, opens: number): number {
  if (opens === 0) return 0
  return Number(((clicks / opens) * 100).toFixed(2))
}

export function calculateOpenRate(opens: number, sent: number): number {
  if (sent === 0) return 0
  return Number(((opens / sent) * 100).toFixed(2))
}
