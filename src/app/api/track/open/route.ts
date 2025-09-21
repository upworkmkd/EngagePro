import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTrackingSignature } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackingId = searchParams.get('id')
    const signature = searchParams.get('sig')

    if (!trackingId || !signature) {
      return new NextResponse('Missing parameters', { status: 400 })
    }

    // Get tracking event from queue or database
    const trackingData = await redis.get(`tracking:${trackingId}`)
    if (!trackingData) {
      return new NextResponse('Tracking event not found', { status: 404 })
    }

    const { leadId, campaignId, stepId } = JSON.parse(trackingData)

    // Verify signature
    const isValid = verifyTrackingSignature(
      trackingId,
      leadId,
      signature,
      process.env.JWT_SECRET!
    )

    if (!isValid) {
      return new NextResponse('Invalid signature', { status: 403 })
    }

    // Get client IP and User Agent
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Record the open event
    await prisma.trackingOpen.create({
      data: {
        leadId,
        campaignId,
        stepId,
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
        type: 'OPEN',
        metadata: {
          ip,
          userAgent,
          timestamp: new Date(),
        },
      },
    })

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    )

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Tracking open error:', error)
    
    // Return transparent pixel even on error to avoid breaking email display
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    )

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
      },
    })
  }
}
