import { User, Lead, Campaign, CampaignStep, Activity, EmailAccount } from '@prisma/client'

export interface AuthenticatedUser extends User {
  accounts: any[]
}

export interface LeadWithActivities extends Lead {
  activities: Activity[]
  _count?: {
    activities: number
  }
}

export interface CampaignWithSteps extends Campaign {
  steps: CampaignStep[]
  _count?: {
    runs: number
  }
}

export interface CampaignRunWithStats {
  id: string
  campaignId: string
  status: string
  startedAt: Date
  finishedAt?: Date
  statsJson?: any
  leads?: any[]
}

export interface EmailTemplate {
  subject: string
  body: string
  placeholders: string[]
}

export interface LeadFilters {
  search?: string
  country?: string
  category?: string
  hasEmail?: boolean
  hasWebsite?: boolean
  bounced?: boolean
  rating?: {
    min?: number
    max?: number
  }
  lastContacted?: {
    before?: Date
    after?: Date
  }
}

export interface CampaignFilters {
  countries?: string[]
  categories?: string[]
  hasWebsite?: boolean
  hasEmail?: boolean
  ratingMin?: number
  lastContactedDays?: number
}

export interface EnrichmentResult {
  success: boolean
  email?: string
  method: string
  metadata?: any
}

export interface EmailSendJob {
  leadId: string
  campaignId: string
  stepId: string
  emailAccountId: string
  subject: string
  body: string
  trackingPixelId: string
  linkHashes: { [originalUrl: string]: string }
}

export interface TrackingEvent {
  leadId: string
  campaignId: string
  stepId?: string
  type: 'open' | 'click'
  metadata?: any
}

export interface GooglePlaceResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  types: string[]
  rating?: number
  user_ratings_total?: number
  formatted_phone_number?: string
  website?: string
  business_status?: string
  opening_hours?: any
  photos?: any[]
}

export interface ImportJobPayload {
  userId: string
  countries: string[]
  queries: string[]
  dailyLimit: number
  categories?: string[]
}
