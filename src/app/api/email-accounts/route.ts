import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emailAccounts = await prisma.emailAccount.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        provider: true,
        email: true,
        connectedAt: true,
        isActive: true,
        // Don't return sensitive tokens
      },
    })

    return NextResponse.json({ emailAccounts })
  } catch (error) {
    console.error('Email accounts fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email accounts' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    await prisma.emailAccount.update({
      where: {
        id: accountId,
        userId: session.user.id,
      },
      data: {
        isActive: false,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Email account disconnected',
    })
  } catch (error) {
    console.error('Email account disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect email account' },
      { status: 500 }
    )
  }
}
