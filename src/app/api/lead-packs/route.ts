import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const leadPackSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  leadIds: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leadPacks = await prisma.leadPack.findMany({
      where: { userId: user.id },
      include: {
        leads: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ leadPacks })
  } catch (error) {
    console.error('Failed to fetch lead packs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead packs' },
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
    const validatedData = leadPackSchema.parse(body)

    const leadPack = await prisma.leadPack.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || '',
        userId: user.id,
        leads: {
          connect: validatedData.leadIds?.map(id => ({ id })) || []
        }
      },
      include: {
        leads: true,
      },
    })

    return NextResponse.json({ leadPack }, { status: 201 })
  } catch (error) {
    console.error('Failed to create lead pack:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create lead pack' },
      { status: 500 }
    )
  }
}
