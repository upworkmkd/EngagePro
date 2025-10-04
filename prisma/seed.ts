import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo@123*', 12)
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@engagepro.com' },
    update: {},
    create: {
      email: 'demo@engagepro.com',
      name: 'Demo User',
      password: hashedPassword,
      emailVerified: new Date(),
    },
  })

  console.log('✅ Created demo user:', demoUser.email)

  // Create sample leads
  const sampleLeads = [
    {
      name: 'Acme Corporation',
      category: 'Technology',
      address: '123 Main St, San Francisco, CA 94105',
      city: 'San Francisco',
      region: 'CA',
      country: 'United States',
      phone: '+1-555-0123',
      website: 'https://acme.com',
      email: 'contact@acme.com',
      rating: 4.5,
      reviewsCount: 150,
      source: 'demo',
    },
    {
      name: 'TechStart Inc',
      category: 'Software',
      address: '456 Oak Ave, Austin, TX 78701',
      city: 'Austin',
      region: 'TX',
      country: 'United States',
      phone: '+1-555-0456',
      website: 'https://techstart.com',
      email: 'hello@techstart.com',
      rating: 4.2,
      reviewsCount: 89,
      source: 'demo',
    },
    {
      name: 'Digital Solutions Ltd',
      category: 'Marketing',
      address: '789 Pine St, New York, NY 10001',
      city: 'New York',
      region: 'NY',
      country: 'United States',
      phone: '+1-555-0789',
      website: 'https://digitalsolutions.com',
      email: 'info@digitalsolutions.com',
      rating: 4.8,
      reviewsCount: 234,
      source: 'demo',
    },
    {
      name: 'Innovation Hub',
      category: 'Consulting',
      address: '321 Elm St, Boston, MA 02101',
      city: 'Boston',
      region: 'MA',
      country: 'United States',
      phone: '+1-555-0321',
      website: 'https://innovationhub.com',
      // No email - for enrichment testing
      rating: 4.3,
      reviewsCount: 67,
      source: 'demo',
    },
    {
      name: 'Future Tech Co',
      category: 'AI/ML',
      address: '654 Maple Dr, Seattle, WA 98101',
      city: 'Seattle',
      region: 'WA',
      country: 'United States',
      phone: '+1-555-0654',
      website: 'https://futuretech.com',
      email: 'team@futuretech.com',
      rating: 4.7,
      reviewsCount: 156,
      source: 'demo',
    },
  ]

  for (const leadData of sampleLeads) {
    await prisma.lead.upsert({
      where: {
        userId_name: {
          userId: demoUser.id,
          name: leadData.name,
        },
      },
      update: {},
      create: {
        ...leadData,
        userId: demoUser.id,
      },
    })
  }

  console.log('✅ Created sample leads')

  // Create sample campaigns
  const sampleCampaigns = [
    {
      name: 'Tech Outreach Campaign',
      filtersJson: {
        countries: ['United States'],
        categories: ['Technology', 'Software', 'AI/ML'],
        hasWebsite: true,
        hasEmail: true,
        ratingMin: 4.0,
      },
      isActive: true,
    },
    {
      name: 'Marketing Services',
      filtersJson: {
        countries: ['United States'],
        categories: ['Marketing', 'Consulting'],
        hasWebsite: true,
      },
      isActive: false,
    },
  ]

  for (const campaignData of sampleCampaigns) {
    const campaign = await prisma.campaign.upsert({
      where: {
        userId_name: {
          userId: demoUser.id,
          name: campaignData.name,
        },
      },
      update: {},
      create: {
        ...campaignData,
        userId: demoUser.id,
      },
    })

    // Create campaign steps
    await prisma.campaignStep.upsert({
      where: {
        campaignId_stepOrder: {
          campaignId: campaign.id,
          stepOrder: 1,
        },
      },
      update: {},
      create: {
        campaignId: campaign.id,
        stepOrder: 1,
        subjectTemplate: 'Hello {{name}}, interested in {{category}} services?',
        bodyTemplate: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2>Hello {{name}},</h2>
              <p>I hope this email finds you well. I noticed that {{company}} is in the {{category}} industry in {{city}}, {{country}}.</p>
              <p>I'd love to learn more about your business and see if there's a way we could work together.</p>
              <p>Would you be available for a brief call this week to discuss?</p>
              <p>Best regards,<br>
              Your Name</p>
            </body>
          </html>
        `,
        waitType: 'minutes',
        waitValue: 60,
        condition: 'always',
      },
    })

    await prisma.campaignStep.upsert({
      where: {
        campaignId_stepOrder: {
          campaignId: campaign.id,
          stepOrder: 2,
        },
      },
      update: {},
      create: {
        campaignId: campaign.id,
        stepOrder: 2,
        subjectTemplate: 'Following up on {{category}} services',
        bodyTemplate: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2>Hi {{name}},</h2>
              <p>I wanted to follow up on my previous email about {{category}} services.</p>
              <p>I understand you're busy, but I believe there's a great opportunity for us to work together.</p>
              <p>Would you be interested in a quick 15-minute call to discuss?</p>
              <p>Best regards,<br>
              Your Name</p>
            </body>
          </html>
        `,
        waitType: 'hours',
        waitValue: 24,
        condition: 'no_open',
        conditionValue: 1, // 1 day
      },
    })
  }

  console.log('✅ Created sample campaigns with steps')

  // Create sample email account (demo)
  await prisma.emailAccount.upsert({
    where: {
      userId_email: {
        userId: demoUser.id,
        email: 'demo@engagepro.com',
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      provider: 'gmail',
      email: 'demo@engagepro.com',
      refreshToken: 'demo-refresh-token',
      accessToken: 'demo-access-token',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      isActive: true,
    },
  })

  console.log('✅ Created demo email account')

  // Create sample activities
  const leads = await prisma.lead.findMany({
    where: { userId: demoUser.id },
    take: 3,
  })

  const campaigns = await prisma.campaign.findMany({
    where: { userId: demoUser.id },
    take: 1,
  })

  if (leads.length > 0 && campaigns.length > 0) {
    const campaign = campaigns[0]
    const steps = await prisma.campaignStep.findMany({
      where: { campaignId: campaign.id },
    })

    for (const lead of leads) {
      if (lead.email) {
        // Create sent activity
        await prisma.activity.create({
          data: {
            leadId: lead.id,
            campaignId: campaign.id,
            stepId: steps[0]?.id,
            type: 'SENT',
            metadata: {
              timestamp: new Date(),
              email: lead.email,
            },
          },
        })

        // Randomly create open and click activities
        if (Math.random() > 0.3) {
          await prisma.trackingOpen.create({
            data: {
              leadId: lead.id,
              campaignId: campaign.id,
              stepId: steps[0]?.id,
              ip: '127.0.0.1',
              userAgent: 'Demo Browser',
            },
          })

          await prisma.activity.create({
            data: {
              leadId: lead.id,
              campaignId: campaign.id,
              stepId: steps[0]?.id,
              type: 'OPEN',
              metadata: {
                timestamp: new Date(),
              },
            },
          })

          if (Math.random() > 0.5) {
            await prisma.trackingClick.create({
              data: {
                leadId: lead.id,
                campaignId: campaign.id,
                stepId: steps[0]?.id,
                url: 'https://example.com',
                ip: '127.0.0.1',
                userAgent: 'Demo Browser',
              },
            })

            await prisma.activity.create({
              data: {
                leadId: lead.id,
                campaignId: campaign.id,
                stepId: steps[0]?.id,
                type: 'CLICK',
                metadata: {
                  timestamp: new Date(),
                  url: 'https://example.com',
                },
              },
            })
          }
        }
      }
    }
  }

  console.log('✅ Created sample activities and tracking data')

  console.log('🎉 Database seeded successfully!')
  console.log('📧 Demo user email: demo@engagepro.com')
  console.log('🔑 Demo user password: demo@123*')
  console.log('🔐 You can sign in with email/password or Google OAuth to access the demo data')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
