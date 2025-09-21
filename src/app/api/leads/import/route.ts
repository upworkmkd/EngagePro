import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { importQueue } from '@/lib/queue'
import { z } from 'zod'

const importSchema = z.object({
  countries: z.array(z.string()).min(1),
  queries: z.array(z.string()).min(1),
  dailyLimit: z.number().min(1).max(1000),
  categories: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = importSchema.parse(body)

    // Add job to import queue
    const job = await importQueue.add('google-places-import', {
      userId: session.user.id,
      ...validatedData,
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Import job started successfully',
    })
  } catch (error) {
    console.error('Import error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to start import job' },
      { status: 500 }
    )
  }
}
