import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const campaignSchema = z.object({
  name: z.string().min(1),
  filtersJson: z.object({
    countries: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    hasWebsite: z.boolean().optional(),
    hasEmail: z.boolean().optional(),
    ratingMin: z.number().optional(),
    lastContactedDays: z.number().optional(),
  }).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where: { userId: session.user.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' },
          },
          _count: {
            select: { runs: true },
          },
        },
      }),
      prisma.campaign.count({
        where: { userId: session.user.id },
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = campaignSchema.parse(body)

    const campaign = await prisma.campaign.create({
      data: {
        ...validatedData,
        userId: session.user.id,
      },
      include: {
        steps: true,
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

    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}
