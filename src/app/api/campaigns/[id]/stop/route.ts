import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'

import { prisma } from '@/lib/prisma'

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
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { isActive: false },
    })

    // Stop any running campaign runs
    await prisma.campaignRun.updateMany({
      where: {
        campaignId: campaign.id,
        status: { in: ['RUNNING', 'PAUSED'] as const },
      },
      data: {
        status: 'STOPPED' as const,
        finishedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Campaign stopped successfully',
    })
  } catch (error) {
    console.error('Campaign stop error:', error)
    return NextResponse.json(
      { error: 'Failed to stop campaign' },
      { status: 500 }
    )
  }
}
