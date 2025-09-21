import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LeadFilters } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const country = searchParams.get('country')
    const category = searchParams.get('category')
    const hasEmail = searchParams.get('hasEmail')
    const hasWebsite = searchParams.get('hasWebsite')
    const bounced = searchParams.get('bounced')
    const ratingMin = searchParams.get('ratingMin')
    const ratingMax = searchParams.get('ratingMax')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      userId: session.user.id,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { website: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (country) {
      where.country = country
    }

    if (category) {
      where.category = { contains: category, mode: 'insensitive' }
    }

    if (hasEmail === 'true') {
      where.email = { not: null }
    } else if (hasEmail === 'false') {
      where.email = null
    }

    if (hasWebsite === 'true') {
      where.website = { not: null }
    } else if (hasWebsite === 'false') {
      where.website = null
    }

    if (bounced === 'true') {
      where.bounced = true
    } else if (bounced === 'false') {
      where.bounced = false
    }

    if (ratingMin || ratingMax) {
      where.rating = {}
      if (ratingMin) where.rating.gte = parseFloat(ratingMin)
      if (ratingMax) where.rating.lte = parseFloat(ratingMax)
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { activities: true },
          },
        },
      }),
      prisma.lead.count({ where }),
    ])

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Leads fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
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
    
    const lead = await prisma.lead.create({
      data: {
        ...body,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ lead }, { status: 201 })
  } catch (error) {
    console.error('Lead creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    )
  }
}
