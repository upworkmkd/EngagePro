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
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Campaign fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { steps, ...campaignData } = body

    // Convert email account IDs to email addresses if needed
    let senderEmails = campaignData.senderEmails
    if (senderEmails && senderEmails.length > 0) {
      // Check if senderEmails contains IDs (they look like CUIDs) or email addresses
      const hasIds = senderEmails.some((email: string) => email.includes('cm'))
      
      if (hasIds) {
        // Convert IDs to email addresses
        const emailAccounts = await prisma.emailAccount.findMany({
          where: {
            id: { in: senderEmails },
            userId: user.id,
          },
          select: { email: true },
        })
        
        senderEmails = emailAccounts.map(acc => acc.email)
      }
    }

    // First, delete all existing steps
    await prisma.campaignStep.deleteMany({
      where: {
        campaignId: params.id,
      },
    })

    // Then update the campaign and create new steps
    const campaign = await prisma.campaign.update({
      where: {
        id: params.id,
        userId: user.id,
      },
      data: {
        ...campaignData,
        senderEmails,
        steps: {
          create: steps.map((step: any) => ({
            stepOrder: step.stepOrder,
            subjectTemplate: step.subjectTemplate,
            bodyTemplate: step.bodyTemplate,
            waitType: step.waitType,
            waitValue: step.waitValue,
            condition: step.condition,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    })

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Campaign update error:', error)
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.campaign.delete({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Campaign delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    )
  }
}
