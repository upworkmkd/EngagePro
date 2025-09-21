import {
  compileTemplate,
  extractPlaceholders,
  validateTemplate,
  addTrackingPixel,
  addUnsubscribeFooter,
  rewriteLinks,
} from '../lib/templates'

describe('Templates', () => {
  describe('compileTemplate', () => {
    it('should compile templates with placeholder data', () => {
      const template = 'Hello {{name}}, welcome to {{company}}!'
      const data = {
        name: 'John Doe',
        company: 'Acme Corp',
      }
      
      const result = compileTemplate(template, data)
      expect(result).toBe('Hello John Doe, welcome to Acme Corp!')
    })

    it('should handle missing placeholder data gracefully', () => {
      const template = 'Hello {{name}}, your email is {{email}}'
      const data = {
        name: 'John Doe',
        // email is missing
      }
      
      const result = compileTemplate(template, data)
      expect(result).toBe('Hello John Doe, your email is ')
    })

    it('should handle complex templates', () => {
      const template = `
        <h1>Welcome {{name}}!</h1>
        <p>Your company {{company}} is located in {{city}}, {{country}}.</p>
        <p>Rating: {{rating}}/5</p>
      `
      const data = {
        name: 'Jane Smith',
        company: 'Tech Corp',
        city: 'San Francisco',
        country: 'USA',
        rating: 4.5,
      }
      
      const result = compileTemplate(template, data)
      expect(result).toContain('Welcome Jane Smith!')
      expect(result).toContain('Tech Corp is located in San Francisco, USA')
      expect(result).toContain('Rating: 4.5/5')
    })
  })

  describe('extractPlaceholders', () => {
    it('should extract all unique placeholders from a template', () => {
      const template = 'Hello {{name}}, welcome to {{company}}! Your email is {{email}}.'
      const placeholders = extractPlaceholders(template)
      
      expect(placeholders).toContain('name')
      expect(placeholders).toContain('company')
      expect(placeholders).toContain('email')
      expect(placeholders).toHaveLength(3)
    })

    it('should handle templates with duplicate placeholders', () => {
      const template = 'Hello {{name}}, {{name}}! Your name is {{name}}.'
      const placeholders = extractPlaceholders(template)
      
      expect(placeholders).toEqual(['name'])
    })

    it('should handle templates with no placeholders', () => {
      const template = 'Hello world!'
      const placeholders = extractPlaceholders(template)
      
      expect(placeholders).toEqual([])
    })
  })

  describe('validateTemplate', () => {
    it('should validate correct templates', () => {
      const template = 'Hello {{name}}, welcome to {{company}}!'
      const result = validateTemplate(template)
      
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should reject empty templates', () => {
      const template = ''
      const result = validateTemplate(template)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Template cannot be empty')
    })

    it('should detect potentially dangerous script tags', () => {
      const template = 'Hello {{name}}<script>alert("xss")</script>'
      const result = validateTemplate(template)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Template contains potentially dangerous script tags')
    })

    it('should detect potentially dangerous javascript URLs', () => {
      const template = 'Hello {{name}}<a href="javascript:alert(1)">Click</a>'
      const result = validateTemplate(template)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Template contains potentially dangerous javascript: URLs')
    })
  })

  describe('addTrackingPixel', () => {
    it('should add tracking pixel before closing body tag', () => {
      const html = '<html><body><p>Content</p></body></html>'
      const trackingUrl = 'https://example.com/track'
      
      const result = addTrackingPixel(html, trackingUrl)
      
      expect(result).toContain('src="https://example.com/track"')
      expect(result).toContain('width="1" height="1"')
      expect(result).toContain('style="display:none;"')
    })

    it('should add tracking pixel at the end if no body tag', () => {
      const html = '<p>Content</p>'
      const trackingUrl = 'https://example.com/track'
      
      const result = addTrackingPixel(html, trackingUrl)
      
      expect(result).toContain('src="https://example.com/track"')
    })
  })

  describe('addUnsubscribeFooter', () => {
    it('should add unsubscribe footer before closing body tag', () => {
      const html = '<html><body><p>Content</p></body></html>'
      const unsubscribeUrl = 'https://example.com/unsubscribe'
      
      const result = addUnsubscribeFooter(html, unsubscribeUrl)
      
      expect(result).toContain('unsubscribe')
      expect(result).toContain('href="https://example.com/unsubscribe"')
    })

    it('should add unsubscribe footer at the end if no body tag', () => {
      const html = '<p>Content</p>'
      const unsubscribeUrl = 'https://example.com/unsubscribe'
      
      const result = addUnsubscribeFooter(html, unsubscribeUrl)
      
      expect(result).toContain('unsubscribe')
    })
  })

  describe('rewriteLinks', () => {
    it('should rewrite links according to link map', () => {
      const html = '<a href="https://example.com">Visit us</a>'
      const linkMap = {
        'https://example.com': 'https://track.example.com/abc123'
      }
      
      const result = rewriteLinks(html, linkMap)
      
      expect(result).toContain('href="https://track.example.com/abc123"')
    })

    it('should handle multiple links', () => {
      const html = `
        <a href="https://example.com">Visit us</a>
        <a href="https://other.com">Other link</a>
      `
      const linkMap = {
        'https://example.com': 'https://track.example.com/abc123',
        'https://other.com': 'https://track.example.com/def456'
      }
      
      const result = rewriteLinks(html, linkMap)
      
      expect(result).toContain('href="https://track.example.com/abc123"')
      expect(result).toContain('href="https://track.example.com/def456"')
    })

    it('should not modify links not in the map', () => {
      const html = '<a href="https://example.com">Visit us</a>'
      const linkMap = {
        'https://other.com': 'https://track.example.com/abc123'
      }
      
      const result = rewriteLinks(html, linkMap)
      
      expect(result).toContain('href="https://example.com"')
    })
  })
})
