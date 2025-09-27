import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateEmailAccountSchema = z.object({
  name: z.string().optional().nullable(),
  dailyLimit: z.number().min(1).max(1000).optional(),
  isActive: z.boolean().optional(),
})

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
    const validatedData = updateEmailAccountSchema.parse(body)

    // Verify the email account belongs to the user
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!emailAccount) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      )
    }

    const updatedAccount = await prisma.emailAccount.update({
      where: { id: params.id },
      data: validatedData,
    })

    return NextResponse.json({ emailAccount: updatedAccount })
  } catch (error) {
    console.error('Error updating email account:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update email account' },
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

    // Verify the email account belongs to the user
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!emailAccount) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      )
    }

    await prisma.emailAccount.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting email account:', error)
    return NextResponse.json(
      { error: 'Failed to delete email account' },
      { status: 500 }
    )
  }
}
