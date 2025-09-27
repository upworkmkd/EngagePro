import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const campaignStepSchema = z.object({
  stepOrder: z.number().min(1),
  subjectTemplate: z.string().min(1),
  bodyTemplate: z.string().min(1),
  waitType: z.enum(['minutes', 'hours', 'days']),
  waitValue: z.number().min(1),
  condition: z.string().optional(),
})

const campaignSchema = z.object({
  name: z.string().min(1),
  leadSelectionType: z.enum(['leadpack', 'filters']).default('filters'),
  selectedLeadPack: z.string().optional(),
  senderEmails: z.array(z.string()).min(1),
  filtersJson: z.object({
    industry: z.string().optional(),
    location: z.string().optional(),
    companySize: z.string().optional(),
    ratingMin: z.number().optional(),
    lastContactedDays: z.number().optional(),
  }).optional(),
  steps: z.array(campaignStepSchema).min(1),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where: { userId: user.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          leadSelectionType: true,
          selectedLeadPack: true,
          senderEmails: true,
          filtersJson: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          steps: {
            orderBy: { stepOrder: 'asc' },
          },
          _count: {
            select: { runs: true },
          },
        },
      }),
      prisma.campaign.count({
        where: { userId: user.id },
      }),
    ])

    return NextResponse.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Campaigns fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = campaignSchema.parse(body)

        const { steps, senderEmails, leadSelectionType, selectedLeadPack, filtersJson, ...campaignData } = validatedData

        const campaign = await prisma.campaign.create({
          data: {
            name: campaignData.name,
            leadSelectionType: leadSelectionType,
            selectedLeadPack: selectedLeadPack,
            senderEmails: senderEmails,
            filtersJson: filtersJson,
            userId: user.id,
            steps: {
              create: steps.map(step => ({
                stepOrder: step.stepOrder,
                subjectTemplate: step.subjectTemplate,
                bodyTemplate: step.bodyTemplate,
                waitType: step.waitType,
                waitValue: step.waitValue,
                condition: step.condition,
              }))
            }
          },
          include: {
            steps: {
              orderBy: { stepOrder: 'asc' }
            },
          },
        })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error('Campaign creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    // Handle specific database errors
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return NextResponse.json(
        {
          error: 'A campaign with this name already exists',
          details: [{ path: ['name'], message: 'Campaign name must be unique' }]
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}
