// Note: Handlebars is only used in server-side code (workers)
// For client-side, we'll use simple string replacement
const isServer = typeof window === 'undefined'

let Handlebars: any = null
if (isServer) {
  try {
    // Dynamic import to avoid webpack issues
    Handlebars = eval('require')('handlebars')
  } catch (e) {
    // Handlebars not available on client side
  }
}

// Register custom helpers (only on server side)
if (isServer && Handlebars) {
  Handlebars.registerHelper('formatDate', (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date))
  })

  Handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  })

  Handlebars.registerHelper('capitalize', (str: string) => {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  })
}

export interface TemplateData {
  name: string
  email?: string
  company?: string
  category?: string
  city?: string
  region?: string
  country?: string
  website?: string
  phone?: string
  rating?: number
  [key: string]: any
}

export function compileTemplate(template: string, data: TemplateData): string {
  try {
    if (isServer && Handlebars) {
      const compiled = Handlebars.compile(template)
      return compiled(data)
    } else {
      // Fallback for client-side: simple string replacement
      let result = template
      Object.entries(data).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`
        result = result.replace(new RegExp(placeholder, 'g'), String(value || ''))
      })
      return result
    }
  } catch (error) {
    console.error('Template compilation error:', error)
    return template // Return original template if compilation fails
  }
}

export function extractPlaceholders(template: string): string[] {
  const placeholderRegex = /\{\{([^}]+)\}\}/g
  const placeholders: string[] = []
  let match

  while ((match = placeholderRegex.exec(template)) !== null) {
    const placeholder = match[1].trim()
    if (!placeholders.includes(placeholder)) {
      placeholders.push(placeholder)
    }
  }

  return placeholders
}

export function validateTemplate(template: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  try {
    if (isServer && Handlebars) {
      Handlebars.compile(template)
    }
    // On client side, we skip Handlebars validation
  } catch (error) {
    errors.push(`Template compilation error: ${error}`)
  }

  // Check for basic template structure
  if (!template.trim()) {
    errors.push('Template cannot be empty')
  }

  // Check for potential security issues
  if (template.includes('<script')) {
    errors.push('Template contains potentially dangerous script tags')
  }

  if (template.includes('javascript:')) {
    errors.push('Template contains potentially dangerous javascript: URLs')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function addTrackingPixel(html: string, trackingUrl: string): string {
  const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`
  
  // Add tracking pixel before closing body tag, or at the end if no body tag
  if (html.includes('</body>')) {
    return html.replace('</body>', `${trackingPixel}</body>`)
  } else {
    return html + trackingPixel
  }
}

export function addUnsubscribeFooter(html: string, unsubscribeUrl: string): string {
  const footer = `
    <div style="margin-top: 20px; padding: 10px; font-size: 12px; color: #666; border-top: 1px solid #eee;">
      <p>If you no longer wish to receive these emails, you can <a href="${unsubscribeUrl}">unsubscribe here</a>.</p>
    </div>
  `
  
  // Add footer before closing body tag, or at the end if no body tag
  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`)
  } else {
    return html + footer
  }
}

export function rewriteLinks(html: string, linkMap: { [originalUrl: string]: string }): string {
  let rewrittenHtml = html
  
  Object.entries(linkMap).forEach(([originalUrl, trackingUrl]) => {
    const regex = new RegExp(`href=["']${originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'gi')
    rewrittenHtml = rewrittenHtml.replace(regex, `href="${trackingUrl}"`)
  })
  
  return rewrittenHtml
}

export const defaultTemplates = {
  subject: 'Hello {{name}}, interested in {{category}} services?',
  body: `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Hello {{name}},</h2>
        <p>I hope this email finds you well. I noticed that {{company}} is in the {{category}} industry in {{city}}, {{country}}.</p>
        <p>I'd love to learn more about your business and see if there's a way we could work together.</p>
        <p>Would you be available for a brief call this week to discuss?</p>
        <p>Best regards,<br>
        Your Name</p>
      </body>
    </html>
  `,
}
