import {
  generateTrackingId,
  generateTrackingSignature,
  verifyTrackingSignature,
  generateLinkHash,
  randomDelay,
  validateEmail,
  extractDomainFromEmail,
  guessEmailVariations,
  calculateCTR,
  calculateOpenRate,
} from '../lib/utils'

describe('Utils', () => {
  describe('generateTrackingId', () => {
    it('should generate a unique tracking ID', () => {
      const id1 = generateTrackingId()
      const id2 = generateTrackingId()
      
      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id1).not.toBe(id2)
      expect(id1).toHaveLength(32) // 16 bytes = 32 hex chars
    })
  })

  describe('Tracking signatures', () => {
    const secret = 'test-secret'
    const trackingId = 'test-tracking-id'
    const leadId = 'test-lead-id'

    it('should generate and verify tracking signatures', () => {
      const signature = generateTrackingSignature(trackingId, leadId, secret)
      const isValid = verifyTrackingSignature(trackingId, leadId, signature, secret)
      
      expect(signature).toBeDefined()
      expect(isValid).toBe(true)
    })

    it('should reject invalid signatures', () => {
      const signature = generateTrackingSignature(trackingId, leadId, secret)
      const isValid = verifyTrackingSignature(trackingId, leadId, 'invalid-signature', secret)
      
      expect(isValid).toBe(false)
    })

    it('should reject signatures with different data', () => {
      const signature = generateTrackingSignature(trackingId, leadId, secret)
      const isValid = verifyTrackingSignature(trackingId, 'different-lead-id', signature, secret)
      
      expect(isValid).toBe(false)
    })
  })

  describe('generateLinkHash', () => {
    it('should generate consistent hashes for the same URL', () => {
      const url = 'https://example.com/test'
      const hash1 = generateLinkHash(url)
      const hash2 = generateLinkHash(url)
      
      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different URLs', () => {
      const url1 = 'https://example.com/test1'
      const url2 = 'https://example.com/test2'
      const hash1 = generateLinkHash(url1)
      const hash2 = generateLinkHash(url2)
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('randomDelay', () => {
    it('should generate delays within the specified range', () => {
      const minMinutes = 5
      const maxMinutes = 10
      
      for (let i = 0; i < 10; i++) {
        const delay = randomDelay(minMinutes, maxMinutes)
        const minMs = minMinutes * 60 * 1000
        const maxMs = maxMinutes * 60 * 1000
        
        expect(delay).toBeGreaterThanOrEqual(minMs)
        expect(delay).toBeLessThanOrEqual(maxMs)
      }
    })
  })

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@gmail.com',
        '123@test.org',
      ]
      
      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true)
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test@.com',
        'test..test@example.com',
      ]
      
      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false)
      })
    })
  })

  describe('extractDomainFromEmail', () => {
    it('should extract domain from email addresses', () => {
      expect(extractDomainFromEmail('test@example.com')).toBe('example.com')
      expect(extractDomainFromEmail('user@subdomain.example.co.uk')).toBe('subdomain.example.co.uk')
    })

    it('should return null for invalid emails', () => {
      expect(extractDomainFromEmail('invalid-email')).toBeNull()
      expect(extractDomainFromEmail('@example.com')).toBeNull()
    })
  })

  describe('guessEmailVariations', () => {
    it('should generate email variations for a domain and name', () => {
      const domain = 'example.com'
      const name = 'John Doe'
      const variations = guessEmailVariations(domain, name)
      
      expect(variations).toContain('john.doe@example.com')
      expect(variations).toContain('johndoe@example.com')
      expect(variations).toContain('info@example.com')
      expect(variations).toContain('contact@example.com')
    })
  })

  describe('calculateCTR', () => {
    it('should calculate click-through rate correctly', () => {
      expect(calculateCTR(10, 100)).toBe(10)
      expect(calculateCTR(5, 50)).toBe(10)
      expect(calculateCTR(0, 100)).toBe(0)
      expect(calculateCTR(10, 0)).toBe(0)
    })
  })

  describe('calculateOpenRate', () => {
    it('should calculate open rate correctly', () => {
      expect(calculateOpenRate(50, 100)).toBe(50)
      expect(calculateOpenRate(25, 200)).toBe(12.5)
      expect(calculateOpenRate(0, 100)).toBe(0)
      expect(calculateOpenRate(10, 0)).toBe(0)
    })
  })
})
