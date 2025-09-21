import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'

import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GMAIL_OAUTH_REDIRECT
)

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      // Generate auth URL
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
        ],
        prompt: 'consent',
      })

      return NextResponse.json({ authUrl })
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data } = await oauth2.userinfo.get()

    if (!data.email) {
      return NextResponse.json(
        { error: 'Could not retrieve email address' },
        { status: 400 }
      )
    }

    // Store email account
    const emailAccount = await prisma.emailAccount.upsert({
      where: {
        userId_email: {
          userId: user.id,
          email: data.email,
        },
      },
      update: {
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isActive: true,
      },
      create: {
        userId: user.id,
        provider: 'gmail',
        email: data.email,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      emailAccount,
      message: 'Gmail account connected successfully',
    })
  } catch (error) {
    console.error('Gmail connection error:', error)
    return NextResponse.json(
      { error: 'Failed to connect Gmail account' },
      { status: 500 }
    )
  }
}
