import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'

import { prisma } from '@/lib/prisma'
import { emailQueue } from '@/lib/queue'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (!campaign.steps.length) {
      return NextResponse.json(
        { error: 'Campaign has no steps' },
        { status: 400 }
      )
    }

    // Check if there's already a running campaign
    const existingRun = await prisma.campaignRun.findFirst({
      where: {
        campaignId: campaign.id,
        status: { in: ['RUNNING', 'PAUSED'] as const },
      },
    })

    if (existingRun) {
      return NextResponse.json(
        { error: 'Campaign is already running' },
        { status: 400 }
      )
    }

    // Create campaign run
    const campaignRun = await prisma.campaignRun.create({
      data: {
        campaignId: campaign.id,
        status: 'RUNNING' as const,
      },
    })

    // Get leads matching campaign filters
    const whereClause: any = {
      userId: user.id,
      bounced: false,
    }

    if (campaign.filtersJson) {
      const filters = campaign.filtersJson as any
      
      if (filters.countries?.length) {
        whereClause.country = { in: filters.countries }
      }
      
      if (filters.categories?.length) {
        whereClause.category = { in: filters.categories }
      }
      
      if (filters.hasWebsite === true) {
        whereClause.website = { not: null }
      } else if (filters.hasWebsite === false) {
        whereClause.website = null
      }
      
      if (filters.hasEmail === true) {
        whereClause.email = { not: null }
      } else if (filters.hasEmail === false) {
        whereClause.email = null
      }
      
      if (filters.ratingMin) {
        whereClause.rating = { gte: filters.ratingMin }
      }
      
      if (filters.lastContactedDays) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - filters.lastContactedDays)
        whereClause.OR = [
          { lastContacted: { lt: cutoffDate } },
          { lastContacted: null },
        ]
      }
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      take: 1000, // Limit for safety
    })

    if (!leads.length) {
      return NextResponse.json(
        { error: 'No leads match the campaign filters' },
        { status: 400 }
      )
    }

    // Create campaign run leads
    const campaignRunLeads = leads.map((lead: any) => ({
      campaignRunId: campaignRun.id,
      leadId: lead.id,
      status: 'PENDING' as const,
    }))

    await prisma.campaignRunLead.createMany({
      data: campaignRunLeads,
    })

    // Get user's email account
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
    })

    if (!emailAccount) {
      return NextResponse.json(
        { error: 'No active email account found. Please connect Gmail first.' },
        { status: 400 }
      )
    }

    // Queue initial emails for first step
    const firstStep = campaign.steps[0]
    const emailJobs = []

    for (const lead of leads.slice(0, 50)) { // Limit initial batch
      if (!lead.email) continue

      emailJobs.push({
        leadId: lead.id,
        campaignId: campaign.id,
        stepId: firstStep.id,
        emailAccountId: emailAccount.id,
        subject: firstStep.subjectTemplate,
        body: firstStep.bodyTemplate,
        campaignRunId: campaignRun.id,
      })
    }

    // Add jobs to queue with random delays
    for (const job of emailJobs) {
      await emailQueue.add('send-email', job, {
        delay: Math.random() * 60000, // Random delay up to 1 minute
      })
    }

    return NextResponse.json({
      success: true,
      campaignRunId: campaignRun.id,
      leadsQueued: emailJobs.length,
      message: 'Campaign started successfully',
    })
  } catch (error) {
    console.error('Campaign start error:', error)
    return NextResponse.json(
      { error: 'Failed to start campaign' },
      { status: 500 }
    )
  }
}
