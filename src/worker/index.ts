import { Worker } from 'bullmq'
import { redis } from '../lib/redis'
import { prisma } from '../lib/prisma'
import { sendEmail, checkBounces } from '../lib/email'
import { enrichLead } from '../lib/enrichment'
import { importGooglePlaces } from '../lib/google-places'
import { compileTemplate } from '../lib/templates'
import { randomDelay, calculateWaitTime } from '../lib/utils'
import { followUpQueue } from '../lib/queue'

// Email sending worker
const emailWorker = new Worker('email-sending', async (job) => {
  const { leadId, campaignId, stepId, emailAccountId, subject, body } = job.data

  try {
    // Get lead data
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    })

    if (!lead || !lead.email || lead.bounced) {
      throw new Error('Lead not found, no email, or bounced')
    }

    // Compile email template with lead data
    const compiledSubject = compileTemplate(subject, {
      name: lead.name,
      email: lead.email || '',
      company: lead.name,
      category: lead.category || '',
      city: lead.city || '',
      region: lead.region || '',
      country: lead.country,
      website: lead.website || '',
      phone: lead.phone || '',
      rating: lead.rating || 0,
    })

    const compiledBody = compileTemplate(body, {
      name: lead.name,
      email: lead.email || '',
      company: lead.name,
      category: lead.category || '',
      city: lead.city || '',
      region: lead.region || '',
      country: lead.country,
      website: lead.website || '',
      phone: lead.phone || '',
      rating: lead.rating || 0,
    })

    // Send email
    await sendEmail({
      to: lead.email,
      subject: compiledSubject,
      html: compiledBody,
      emailAccountId,
      leadId,
      campaignId,
      stepId,
    })

    // Update campaign run lead status
    await prisma.campaignRunLead.updateMany({
      where: {
        leadId,
        campaignRunId: job.data.campaignRunId,
      },
      data: {
        status: 'SENT' as const,
        sentAt: new Date(),
      },
    })

    // Schedule follow-up if needed
    await scheduleFollowUp(leadId, campaignId, stepId)

    console.log(`Email sent successfully to ${lead.email}`)
  } catch (error) {
    console.error(`Email sending failed for lead ${leadId}:`, error)
    throw error
  }
}, {
  connection: redis,
  concurrency: 5,
})

// Lead enrichment worker
const enrichmentWorker = new Worker('lead-enrichment', async (job) => {
  const { leadId, userId } = job.data

  try {
    const result = await enrichLead(leadId, userId)
    
    if (result.success && result.email) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          email: result.email,
          enriched: true,
          enrichmentAttempts: { increment: 1 },
        },
      })

      await prisma.enrichmentAttempt.create({
        data: {
          leadId,
          method: result.method,
          success: true,
          email: result.email,
          metadata: result.metadata,
        },
      })
    } else {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          enrichmentAttempts: { increment: 1 },
        },
      })

      await prisma.enrichmentAttempt.create({
        data: {
          leadId,
          method: result.method,
          success: false,
          metadata: result.metadata,
        },
      })
    }

    console.log(`Enrichment completed for lead ${leadId}: ${result.success ? 'success' : 'failed'}`)
  } catch (error) {
    console.error(`Enrichment failed for lead ${leadId}:`, error)
    throw error
  }
}, {
  connection: redis,
  concurrency: 3,
})

// Google Places import worker
const importWorker = new Worker('google-places-import', async (job) => {
  const { userId, countries, queries, dailyLimit, categories } = job.data

  try {
    const results = await importGooglePlaces({
      userId,
      countries,
      queries,
      dailyLimit,
      categories,
    })

    console.log(`Google Places import completed: ${results.imported} leads imported`)
  } catch (error) {
    console.error('Google Places import failed:', error)
    throw error
  }
}, {
  connection: redis,
  concurrency: 1,
})

// Campaign follow-up worker
const followUpWorker = new Worker('campaign-followup', async (job) => {
  const { leadId, campaignId, stepId, emailAccountId } = job.data

  try {
    // Check if follow-up condition is met
    const shouldSendFollowUp = await checkFollowUpCondition(leadId, campaignId, stepId)
    
    if (shouldSendFollowUp) {
      // Get campaign step
      const step = await prisma.campaignStep.findUnique({
        where: { id: stepId },
      })

      if (!step) {
        throw new Error('Campaign step not found')
      }

      // Get lead data
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      })

      if (!lead || !lead.email || lead.bounced) {
        throw new Error('Lead not found, no email, or bounced')
      }

      // Compile and send follow-up email
      const compiledSubject = compileTemplate(step.subjectTemplate, {
        name: lead.name,
        email: lead.email || '',
        company: lead.name,
        category: lead.category || '',
        city: lead.city || '',
        region: lead.region || '',
        country: lead.country,
        website: lead.website || '',
        phone: lead.phone || '',
        rating: lead.rating || 0,
      })

      const compiledBody = compileTemplate(step.bodyTemplate, {
        name: lead.name,
        email: lead.email || '',
        company: lead.name,
        category: lead.category || '',
        city: lead.city || '',
        region: lead.region || '',
        country: lead.country,
        website: lead.website || '',
        phone: lead.phone || '',
        rating: lead.rating || 0,
      })

      await sendEmail({
        to: lead.email,
        subject: compiledSubject,
        html: compiledBody,
        emailAccountId,
        leadId,
        campaignId,
        stepId,
      })

      console.log(`Follow-up email sent to ${lead.email}`)
    }
  } catch (error) {
    console.error(`Follow-up sending failed for lead ${leadId}:`, error)
    throw error
  }
}, {
  connection: redis,
  concurrency: 3,
})

// Bounce detection worker
const bounceWorker = new Worker('bounce-detection', async (job) => {
  try {
    // Get all active email accounts
    const emailAccounts = await prisma.emailAccount.findMany({
      where: { isActive: true },
    })

    for (const emailAccount of emailAccounts) {
      await checkBounces(emailAccount.id)
    }

    console.log('Bounce detection completed')
  } catch (error) {
    console.error('Bounce detection failed:', error)
    throw error
  }
}, {
  connection: redis,
  concurrency: 1,
})

// Helper functions
async function scheduleFollowUp(leadId: string, campaignId: string, currentStepId: string) {
  const step = await prisma.campaignStep.findUnique({
    where: { id: currentStepId },
  })

  if (!step || !step.condition) {
    return
  }

  // Get next step
  const nextStep = await prisma.campaignStep.findFirst({
    where: {
      campaignId,
      stepOrder: { gt: step.stepOrder },
    },
    orderBy: { stepOrder: 'asc' },
  })

  if (!nextStep) {
    return
  }

  // Calculate delay based on condition
  let delay = 0
  
  if (step.condition === 'no_open' && step.conditionValue) {
    // Schedule follow-up if no open after X days
    delay = step.conditionValue * 24 * 60 * 60 * 1000 // Convert days to milliseconds
  } else if (step.condition === 'always') {
    // Schedule immediately with random delay
    delay = calculateWaitTime(nextStep.waitType, nextStep.waitValue)
  }

  if (delay > 0) {
    await followUpQueue.add('send-followup', {
      leadId,
      campaignId,
      stepId: nextStep.id,
      emailAccountId: '', // Will be determined at send time
    }, {
      delay,
    })
  }
}

async function checkFollowUpCondition(leadId: string, campaignId: string, stepId: string): Promise<boolean> {
  const step = await prisma.campaignStep.findUnique({
    where: { id: stepId },
  })

  if (!step || !step.condition) {
    return false
  }

  if (step.condition === 'no_open') {
    // Check if lead has opened any emails from this campaign
    const hasOpened = await prisma.trackingOpen.findFirst({
      where: {
        leadId,
        campaignId,
      },
    })

    return !hasOpened
  }

  if (step.condition === 'always') {
    return true
  }

  return false
}

// Error handling
emailWorker.on('error', (error) => {
  console.error('Email worker error:', error)
})

enrichmentWorker.on('error', (error) => {
  console.error('Enrichment worker error:', error)
})

importWorker.on('error', (error) => {
  console.error('Import worker error:', error)
})

followUpWorker.on('error', (error) => {
  console.error('Follow-up worker error:', error)
})

bounceWorker.on('error', (error) => {
  console.error('Bounce worker error:', error)
})

console.log('Workers started successfully')

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down workers...')
  await Promise.all([
    emailWorker.close(),
    enrichmentWorker.close(),
    importWorker.close(),
    followUpWorker.close(),
    bounceWorker.close(),
  ])
  process.exit(0)
})
