import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { to, subject, body: emailBody } = body

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      )
    }

    // Get user's active email account
    const emailAccount = await prisma.emailAccount.findFirst({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    })

    if (!emailAccount) {
      return NextResponse.json(
        { error: 'No active email account found. Please connect Gmail first.' },
        { status: 400 }
      )
    }

    // Send test email
    await sendEmail({
      to,
      subject,
      html: emailBody,
      emailAccountId: emailAccount.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
    })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
}
