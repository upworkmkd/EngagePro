import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'

import { prisma } from '@/lib/prisma'
import { enrichmentQueue } from '@/lib/queue'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lead = await prisma.lead.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (lead.email) {
      return NextResponse.json(
        { error: 'Lead already has an email address' },
        { status: 400 }
      )
    }

    // Add enrichment job to queue
    const job = await enrichmentQueue.add('enrich-lead', {
      leadId: lead.id,
      userId: user.id,
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Enrichment job started',
    })
  } catch (error) {
    console.error('Enrichment error:', error)
    return NextResponse.json(
      { error: 'Failed to start enrichment' },
      { status: 500 }
    )
  }
}
