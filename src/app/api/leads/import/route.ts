import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const leadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1), // Required
  category: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  rating: z.number().optional(),
  reviewsCount: z.number().optional(),
})

const importLeadsSchema = z.object({
  leads: z.array(leadSchema).min(1),
  leadPackId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = importLeadsSchema.parse(body)

    const { leads, leadPackId } = validatedData

    // If leadPackId is provided, verify it belongs to the user
    if (leadPackId) {
      const leadPack = await prisma.leadPack.findFirst({
        where: {
          id: leadPackId,
          userId: user.id,
        },
      })

      if (!leadPack) {
        return NextResponse.json(
          { error: 'Lead pack not found' },
          { status: 404 }
        )
      }
    }

    // Check for duplicate emails
    const emails = leads.map(lead => lead.email)
    const existingLeads = await prisma.lead.findMany({
      where: {
        userId: user.id,
        email: {
          in: emails,
        },
      },
      select: { email: true },
    })

    const existingEmails = existingLeads.map((lead: any) => lead.email)
    const newLeads = leads.filter((lead: any) => !existingEmails.includes(lead.email))

    if (newLeads.length === 0) {
      return NextResponse.json(
        { error: 'All leads already exist in the system' },
        { status: 400 }
      )
    }

        // Create the leads
        const createdLeads = await prisma.lead.createMany({
          data: newLeads.map((lead: any) => ({
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone,
        category: lead.category || '',
        address: lead.address || '',
        website: lead.website || '',
        country: lead.country || '',
        city: lead.city || '',
        region: lead.region || '',
        rating: lead.rating || null,
        reviewsCount: lead.reviewsCount || null,
        userId: user.id,
        source: 'csv_import',
        enriched: false,
        bounced: false,
      })),
    })

    // If leadPackId is provided, add the leads to the pack
    if (leadPackId && createdLeads.count > 0) {
      // Get the created lead IDs
      const createdLeadRecords = await prisma.lead.findMany({
        where: {
          userId: user.id,
          email: {
            in: newLeads.map((lead: any) => lead.email),
          },
        },
        select: { id: true },
      })

      // Connect leads to the lead pack
      await prisma.leadPack.update({
        where: { id: leadPackId },
        data: {
          leads: {
            connect: createdLeadRecords.map((lead: any) => ({ id: lead.id })),
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      imported: createdLeads.count,
      skipped: leads.length - newLeads.length,
      message: `Successfully imported ${createdLeads.count} leads${leads.length - newLeads.length > 0 ? `, skipped ${leads.length - newLeads.length} duplicates` : ''}`,
    })
  } catch (error) {
    console.error('Error importing leads:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to import leads' },
      { status: 500 }
    )
  }
}