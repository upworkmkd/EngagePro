import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function GET(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash } = params

    // Get the original URL from Redis or database
    const linkData = await redis.get(`link:${hash}`)
    if (!linkData) {
      return new NextResponse('Link not found', { status: 404 })
    }

    const { originalUrl, leadId, campaignId, stepId } = JSON.parse(linkData)

    // Get client IP and User Agent
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Record the click event
    await prisma.trackingClick.create({
      data: {
        leadId,
        campaignId,
        stepId,
        url: originalUrl,
        ip,
        userAgent,
      },
    })

    // Record activity
    await prisma.activity.create({
      data: {
        leadId,
        campaignId,
        stepId,
        type: 'CLICK' as const,
        metadata: {
          url: originalUrl,
          ip,
          userAgent,
          timestamp: new Date(),
        },
      },
    })

    // Redirect to original URL
    return NextResponse.redirect(originalUrl)
  } catch (error) {
    console.error('Link redirect error:', error)
    return new NextResponse('Redirect failed', { status: 500 })
  }
}
