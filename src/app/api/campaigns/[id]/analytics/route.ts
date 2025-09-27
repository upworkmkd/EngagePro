import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
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

    // Get campaign runs
    const runs = await prisma.campaignRun.findMany({
      where: { campaignId: campaign.id },
      orderBy: { startedAt: 'desc' },
    })

    // Get activity statistics
    const activities = await prisma.activity.findMany({
      where: { campaignId: campaign.id },
      select: {
        type: true,
        createdAt: true,
        leadId: true,
      },
    })

    // Calculate metrics
    const totalSent = activities.filter((a: any) => a.type === 'SENT').length
    const totalDelivered = activities.filter((a: any) => a.type === 'DELIVERED').length
    const totalBounced = activities.filter((a: any) => a.type === 'BOUNCE').length
    const totalOpens = activities.filter((a: any) => a.type === 'OPEN').length
    const totalClicks = activities.filter((a: any) => a.type === 'CLICK').length

    // Get unique opens and clicks
    const uniqueOpens = new Set(
      activities.filter((a: any) => a.type === 'OPEN').map((a: any) => a.leadId)
    ).size

    const uniqueClicks = new Set(
      activities.filter((a: any) => a.type === 'CLICK').map((a: any) => a.leadId)
    ).size

    // Calculate rates
    const openRate = totalSent > 0 ? (uniqueOpens / totalSent) * 100 : 0
    const clickRate = totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 0
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0

    // Get daily activity breakdown
    const dailyActivity = activities.reduce((acc: any, activity: any) => {
      const date = activity.createdAt.toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { sent: 0, opened: 0, clicked: 0, bounced: 0 }
      }
      acc[date][activity.type.toLowerCase() as keyof typeof acc[string]]++
      return acc
    }, {} as Record<string, { sent: number; opened: number; clicked: number; bounced: number }>)

    // Get top performing leads
    const leadStats = await prisma.lead.findMany({
      where: {
        userId: user.id,
        activities: {
          some: {
            campaignId: campaign.id,
          },
        },
      },
      include: {
        _count: {
          select: {
            activities: {
              where: { campaignId: campaign.id },
            },
            trackingOpens: {
              where: { campaignId: campaign.id },
            },
            trackingClicks: {
              where: { campaignId: campaign.id },
            },
          },
        },
      },
      take: 20,
      orderBy: {
        activities: {
          _count: 'desc',
        },
      },
    })

    // Get total leads for this campaign
    const totalLeads = await prisma.campaignRunLead.count({
      where: {
        campaignRun: {
          campaignId: campaign.id,
        },
      },
    })

    return NextResponse.json({
      analytics: {
        totalLeads,
        emailsSent: totalSent,
        emailsDelivered: totalDelivered,
        emailsOpened: uniqueOpens,
        emailsClicked: uniqueClicks,
        emailsBounced: totalBounced,
        openRate: Number(openRate.toFixed(2)),
        clickRate: Number(clickRate.toFixed(2)),
        bounceRate: Number(bounceRate.toFixed(2)),
      },
      runs,
      dailyActivity,
      topLeads: leadStats.map((lead: any) => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        opens: lead._count.trackingOpens,
        clicks: lead._count.trackingClicks,
        activities: lead._count.activities,
      })),
    })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
