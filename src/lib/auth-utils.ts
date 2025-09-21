import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import jwt from 'jsonwebtoken'

export interface AuthUser {
  id: string
  email: string
  role: string
  name?: string
}

export async function getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return null
    }

    // Verify JWT token
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (error) {
      return null
    }

    // Check if session exists in database
    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: true },
    })

    if (!session || session.expires < new Date()) {
      // Clean up expired session
      if (session) {
        await prisma.session.delete({
          where: { sessionToken: token },
        })
      }
      return null
    }

    return {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      name: session.user.name || undefined,
    }
  } catch (error) {
    console.error('Auth check error:', error)
    return null
  }
}

export function requireAuth(handler: (request: NextRequest, user: AuthUser) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    const user = await getCurrentUser(request)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return handler(request, user)
  }
}
