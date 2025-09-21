import { prisma } from './prisma'
import axios from 'axios'
import { GooglePlaceResult, ImportJobPayload } from '@/types'

export interface ImportResult {
  imported: number
  skipped: number
  errors: number
}

export async function importGooglePlaces(payload: ImportJobPayload): Promise<ImportResult> {
  const { userId, countries, queries, dailyLimit, categories } = payload
  
  let imported = 0
  let skipped = 0
  let errors = 0

  for (const country of countries) {
    for (const query of queries) {
      try {
        const places = await fetchGooglePlaces(query, country, dailyLimit)
        
        for (const place of places) {
          try {
            // Check if lead already exists
            const existingLead = await prisma.lead.findFirst({
              where: {
                userId,
                name: place.name,
                address: place.formatted_address,
              },
            })

            if (existingLead) {
              skipped++
              continue
            }

            // Create new lead
            await prisma.lead.create({
              data: {
                userId,
                name: place.name,
                category: place.types?.[0] || 'business',
                address: place.formatted_address,
                city: extractCityFromAddress(place.formatted_address),
                region: extractRegionFromAddress(place.formatted_address),
                country,
                phone: place.formatted_phone_number,
                website: place.website,
                rating: place.rating,
                reviewsCount: place.user_ratings_total,
                rawJson: place as any,
                source: 'google_places',
                enriched: !!place.website,
              },
            })

            imported++
          } catch (error) {
            console.error('Error creating lead:', error)
            errors++
          }
        }
      } catch (error) {
        console.error(`Error fetching places for ${query} in ${country}:`, error)
        errors++
      }
    }
  }

  return { imported, skipped, errors }
}

async function fetchGooglePlaces(
  query: string,
  country: string,
  limit: number
): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  
  if (!apiKey) {
    throw new Error('Google Places API key not configured')
  }

  const places: GooglePlaceResult[] = []
  let nextPageToken: string | undefined

  try {
    do {
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: {
          query: `${query} in ${country}`,
          key: apiKey,
          pagetoken: nextPageToken,
        },
      })

      if (response.data.status !== 'OK') {
        throw new Error(`Google Places API error: ${response.data.status}`)
      }

      // Process results
      for (const result of response.data.results || []) {
        if (places.length >= limit) break

        // Get detailed information for each place
        const placeDetails = await getPlaceDetails(result.place_id, apiKey)
        if (placeDetails) {
          places.push(placeDetails)
        }
      }

      nextPageToken = response.data.next_page_token
      
      // Wait before making next request (required by Google Places API)
      if (nextPageToken) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } while (nextPageToken && places.length < limit)

    return places
  } catch (error) {
    console.error('Google Places API error:', error)
    throw error
  }
}

async function getPlaceDetails(placeId: string, apiKey: string): Promise<GooglePlaceResult | null> {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        fields: 'place_id,name,formatted_address,geometry,types,rating,user_ratings_total,formatted_phone_number,website,business_status,opening_hours,photos',
        key: apiKey,
      },
    })

    if (response.data.status !== 'OK') {
      console.error(`Place details API error: ${response.data.status}`)
      return null
    }

    return response.data.result
  } catch (error) {
    console.error('Error fetching place details:', error)
    return null
  }
}

function extractCityFromAddress(address: string): string | null {
  // Simple extraction - in production, use a proper geocoding service
  const parts = address.split(',')
  if (parts.length >= 2) {
    return parts[parts.length - 2]?.trim() || null
  }
  return null
}

function extractRegionFromAddress(address: string): string | null {
  // Simple extraction - in production, use a proper geocoding service
  const parts = address.split(',')
  if (parts.length >= 3) {
    return parts[parts.length - 3]?.trim() || null
  }
  return null
}

// Alternative implementation using web scraping (if Google Places API is not available)
export async function scrapeGooglePlaces(
  query: string,
  country: string,
  limit: number
): Promise<Partial<GooglePlaceResult>[]> {
  // This is a placeholder for web scraping implementation
  // In a real implementation, you would use tools like Puppeteer or Playwright
  // to scrape Google Maps search results
  
  console.log(`Scraping Google Places for: ${query} in ${country}`)
  
  // Return empty array for now
  return []
}

// Rate limiting helper
class RateLimiter {
  private requests: number[] = []
  private maxRequests: number
  private timeWindow: number

  constructor(maxRequests: number, timeWindowMs: number) {
    this.maxRequests = maxRequests
    this.timeWindow = timeWindowMs
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now()
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow)
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests)
      const waitTime = this.timeWindow - (now - oldestRequest)
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
    
    this.requests.push(now)
  }
}

// Export rate limiter instance
export const googlePlacesRateLimiter = new RateLimiter(10, 1000) // 10 requests per second
