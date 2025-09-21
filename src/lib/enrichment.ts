import { prisma } from './prisma'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { guessEmailVariations, validateEmail } from './utils'

export interface EnrichmentResult {
  success: boolean
  email?: string
  method: string
  metadata?: any
}

export async function enrichLead(leadId: string, userId: string): Promise<EnrichmentResult> {
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      userId,
    },
  })

  if (!lead) {
    throw new Error('Lead not found')
  }

  if (lead.email) {
    return {
      success: true,
      email: lead.email,
      method: 'already_has_email',
    }
  }

  // Try different enrichment methods
  const methods = [
    () => enrichFromWebsite(lead),
    () => enrichFromDomain(lead),
    () => enrichFromPhone(lead),
  ]

  for (const method of methods) {
    try {
      const result = await method()
      if (result.success) {
        return result
      }
    } catch (error) {
      console.error('Enrichment method failed:', error)
    }
  }

  return {
    success: false,
    method: 'all_methods_failed',
    metadata: {
      attempts: lead.enrichmentAttempts + 1,
    },
  }
}

async function enrichFromWebsite(lead: any): Promise<EnrichmentResult> {
  if (!lead.website) {
    return { success: false, method: 'website_scraping' }
  }

  try {
    // Normalize website URL
    let websiteUrl = lead.website
    if (!websiteUrl.startsWith('http')) {
      websiteUrl = `https://${websiteUrl}`
    }

    // Try to find contact page
    const contactUrls = [
      `${websiteUrl}/contact`,
      `${websiteUrl}/contact-us`,
      `${websiteUrl}/about`,
      `${websiteUrl}/about-us`,
      websiteUrl,
    ]

    for (const url of contactUrls) {
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; EngagePro/1.0)',
          },
        })

        const $ = cheerio.load(response.data)
        const pageText = $.text()

        // Look for email patterns
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
        const emails = pageText.match(emailRegex) || []

        // Filter out common non-contact emails
        const contactEmails = emails.filter(email => {
          const lowerEmail = email.toLowerCase()
          return !lowerEmail.includes('noreply') &&
                 !lowerEmail.includes('no-reply') &&
                 !lowerEmail.includes('donotreply') &&
                 validateEmail(email)
        })

        if (contactEmails.length > 0) {
          return {
            success: true,
            email: contactEmails[0],
            method: 'website_scraping',
            metadata: {
              url,
              foundEmails: contactEmails,
            },
          }
        }
      } catch (error) {
        // Continue to next URL
        continue
      }
    }

    return {
      success: false,
      method: 'website_scraping',
      metadata: {
        urlsTried: contactUrls,
      },
    }
  } catch (error) {
    return {
      success: false,
      method: 'website_scraping',
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}

async function enrichFromDomain(lead: any): Promise<EnrichmentResult> {
  if (!lead.website) {
    return { success: false, method: 'domain_guess' }
  }

  try {
    // Extract domain from website
    const domain = extractDomain(lead.website)
    if (!domain) {
      return { success: false, method: 'domain_guess' }
    }

    // Generate email variations
    const emailVariations = guessEmailVariations(domain, lead.name)

    // Try to validate emails (basic check)
    for (const email of emailVariations) {
      if (validateEmail(email)) {
        // In a real implementation, you might want to verify the email exists
        // For now, we'll return the first valid variation
        return {
          success: true,
          email,
          method: 'domain_guess',
          metadata: {
            domain,
            variations: emailVariations,
          },
        }
      }
    }

    return {
      success: false,
      method: 'domain_guess',
      metadata: {
        domain,
        variations: emailVariations,
      },
    }
  } catch (error) {
    return {
      success: false,
      method: 'domain_guess',
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}

async function enrichFromPhone(lead: any): Promise<EnrichmentResult> {
  if (!lead.phone) {
    return { success: false, method: 'phone_lookup' }
  }

  // For now, this is a placeholder
  // In a real implementation, you might integrate with phone lookup services
  // or reverse phone lookup APIs
  
  return {
    success: false,
    method: 'phone_lookup',
    metadata: {
      phone: lead.phone,
      note: 'Phone lookup not implemented - requires external service',
    },
  }
}

function extractDomain(website: string): string | null {
  try {
    const url = new URL(website.startsWith('http') ? website : `https://${website}`)
    return url.hostname.replace('www.', '')
  } catch {
    return null
  }
}

// Batch enrichment for multiple leads
export async function batchEnrichLeads(leadIds: string[], userId: string) {
  const results = []
  
  for (const leadId of leadIds) {
    try {
      const result = await enrichLead(leadId, userId)
      results.push({ leadId, ...result })
    } catch (error) {
      results.push({
        leadId,
        success: false,
        method: 'error',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      })
    }
  }
  
  return results
}
