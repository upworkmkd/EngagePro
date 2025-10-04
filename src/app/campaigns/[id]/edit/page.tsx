'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dynamically import RichTextEditor to prevent SSR issues with Quill
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false })

interface CampaignStep {
  id: string
  stepOrder: number
  subjectTemplate: string
  bodyTemplate: string
  waitType: 'minutes' | 'hours' | 'days'
  waitValue: number
  condition?: string
}

interface EmailAccount {
  id: string
  email: string
  name?: string
  dailyLimit: number
  isActive: boolean
}

interface LeadPack {
  id: string
  name: string
  description?: string
  leadCount: number
}

interface Campaign {
  id: string
  name: string
  isActive: boolean
  leadSelectionType: string
  selectedLeadPack?: string
  senderEmails: string[]
  filtersJson?: any
  steps: CampaignStep[]
}

export default function EditCampaignPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [campaignData, setCampaignData] = useState({
    name: '',
    leadSelectionType: 'filters' as 'leadpack' | 'filters',
    selectedLeadPack: '',
    filters: {
      industry: '',
      location: '',
      companySize: '',
      ratingMin: 0,
      lastContactedDays: 0
    },
    senderEmails: [] as string[]
  })
  const [steps, setSteps] = useState<CampaignStep[]>([])
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([])
  const [leadPacks, setLeadPacks] = useState<LeadPack[]>([])

  useEffect(() => {
    checkAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user && params.id) {
      fetchCampaign()
      fetchEmailAccounts()
      fetchLeadPacks()
    }
  }, [user, params.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update campaign data when campaign and email accounts are loaded
  useEffect(() => {
    if (campaign && emailAccounts.length > 0) {
      setCampaignData({
        name: campaign.name,
        leadSelectionType: (campaign.leadSelectionType as 'leadpack' | 'filters') || 'filters',
        selectedLeadPack: campaign.selectedLeadPack || '',
        filters: campaign.filtersJson || {
          industry: '',
          location: '',
          companySize: '',
          ratingMin: 0,
          lastContactedDays: 0
        },
        senderEmails: campaign.senderEmails || []
      })
    }
  }, [campaign, emailAccounts])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        const campaignData = data.campaign

        setCampaign(campaignData)
        setSteps(campaignData.steps || [])
      } else {
        toast.error('Failed to fetch campaign details.')
        router.push('/campaigns')
      }
    } catch (error) {
      console.error('Failed to fetch campaign:', error)
      toast.error('An unexpected error occurred.')
      router.push('/campaigns')
    }
  }

  const fetchEmailAccounts = async () => {
    try {
      const response = await fetch('/api/email-accounts')
      if (response.ok) {
        const data = await response.json()
        setEmailAccounts(data.emailAccounts.filter((acc: EmailAccount) => acc.isActive))
      } else {
        toast.error('Failed to fetch email accounts.')
      }
    } catch (error) {
      console.error('Error fetching email accounts:', error)
      toast.error('An unexpected error occurred while fetching accounts.')
    }
  }

  const fetchLeadPacks = async () => {
    try {
      const response = await fetch('/api/lead-packs')
      if (response.ok) {
        const data = await response.json()
        setLeadPacks(data.leadPacks)
      } else {
        toast.error('Failed to fetch lead packs.')
      }
    } catch (error) {
      console.error('Error fetching lead packs:', error)
      toast.error('An unexpected error occurred while fetching lead packs.')
    }
  }

  const handleCampaignDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setCampaignData(prev => ({ ...prev, [name]: value }))
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setCampaignData(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [name]: name === 'ratingMin' || name === 'lastContactedDays' ? parseInt(value) || 0 : value
      }
    }))
  }

  const handleSenderEmailChange = (email: string, isChecked: boolean) => {
    setCampaignData(prev => {
      const newSenderEmails = isChecked
        ? [...prev.senderEmails, email]
        : prev.senderEmails.filter(e => e !== email)
      return { ...prev, senderEmails: newSenderEmails }
    })
  }

  const addStep = () => {
    const newStep: CampaignStep = {
      id: Date.now().toString(),
      stepOrder: steps.length + 1,
      subjectTemplate: '',
      bodyTemplate: '',
      waitType: 'minutes',
      waitValue: 60,
    }
    setSteps([...steps, newStep])
  }

  const removeStep = (stepId: string) => {
    if (steps.length > 1) {
      setSteps(prev => prev.filter(step => step.id !== stepId).map((step, index) => ({ ...step, stepOrder: index + 1 })))
    } else {
      toast.error('A campaign must have at least one step.')
    }
  }

  const updateStep = (stepId: string, field: keyof CampaignStep, value: any) => {
    setSteps(prev => prev.map(step => (step.id === stepId ? { ...step, [field]: value } : step)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Basic validation
    if (!campaignData.name.trim()) {
      toast.error('Campaign name is required.')
      setSaving(false)
      return
    }
    if (campaignData.leadSelectionType === 'leadpack' && !campaignData.selectedLeadPack) {
      toast.error('Please select a lead pack.')
      setSaving(false)
      return
    }
    if (campaignData.senderEmails.length === 0) {
      toast.error('Please select at least one sender email.')
      setSaving(false)
      return
    }
    for (const step of steps) {
      if (!step.subjectTemplate.trim() || !step.bodyTemplate.trim()) {
        toast.error(`Step ${step.stepOrder}: Subject and Body templates are required.`)
        setSaving(false)
        return
      }
      if (step.waitValue <= 0) {
        toast.error(`Step ${step.stepOrder}: Wait time must be at least 1.`)
        setSaving(false)
        return
      }
    }

    try {
      const payload = {
        name: campaignData.name,
        leadSelectionType: campaignData.leadSelectionType,
        selectedLeadPack: campaignData.leadSelectionType === 'leadpack' ? campaignData.selectedLeadPack : undefined,
        filtersJson: campaignData.leadSelectionType === 'filters' ? campaignData.filters : undefined,
        senderEmails: campaignData.senderEmails,
        steps: steps.map(step => ({
          stepOrder: step.stepOrder,
          subjectTemplate: step.subjectTemplate,
          bodyTemplate: step.bodyTemplate,
          waitType: step.waitType,
          waitValue: step.waitValue,
          condition: step.condition,
        }))
      }

      const response = await fetch(`/api/campaigns/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Campaign updated successfully!')
        router.push(`/campaigns/${params.id}`)
      } else {
        toast.error(data.error || 'Failed to update campaign.')
        console.error('Campaign update error:', data)
      }
    } catch (error) {
      console.error('Campaign update error:', error)
      toast.error('An unexpected error occurred.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!user || !campaign) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/campaigns/${params.id}`}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Campaign
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Edit Campaign</h1>
            <p className="text-gray-600 mt-2">
              Update your email marketing campaign settings.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Campaign Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Information</h2>
            <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={campaignData.name}
                  onChange={handleCampaignDataChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Lead Selection */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Selection</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Select Leads By:
                </label>
                <div className="mt-1 flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                      name="leadSelectionType"
                      value="filters"
                      checked={campaignData.leadSelectionType === 'filters'}
                      onChange={handleCampaignDataChange}
                    />
                    <span className="ml-2 text-sm text-gray-700">Filters</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                      name="leadSelectionType"
                      value="leadpack"
                      checked={campaignData.leadSelectionType === 'leadpack'}
                      onChange={handleCampaignDataChange}
                    />
                    <span className="ml-2 text-sm text-gray-700">Lead Pack</span>
                  </label>
                </div>
              </div>

              {campaignData.leadSelectionType === 'leadpack' && (
                <div>
                  <label htmlFor="selectedLeadPack" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Lead Pack *
                  </label>
                  <select
                    id="selectedLeadPack"
                    name="selectedLeadPack"
                    required
                    value={campaignData.selectedLeadPack}
                    onChange={handleCampaignDataChange}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  >
                    <option value="">-- Select a Lead Pack --</option>
                    {leadPacks.map(pack => (
                      <option key={pack.id} value={pack.id}>
                        {pack.name} ({pack.leadCount} leads)
                      </option>
                    ))}
                  </select>
                  {leadPacks.length === 0 && (
                    <p className="mt-2 text-sm text-gray-500">No lead packs available. Create one in the Leads section.</p>
                  )}
                </div>
              )}

              {campaignData.leadSelectionType === 'filters' && (
                <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">
                  <div>
                    <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                      Industry
                    </label>
                    <input
                      type="text"
                      name="industry"
                      id="industry"
                      value={campaignData.filters.industry}
                      onChange={handleFilterChange}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      id="location"
                      value={campaignData.filters.location}
                      onChange={handleFilterChange}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-2">
                      Company Size
                    </label>
                    <input
                      type="text"
                      name="companySize"
                      id="companySize"
                      value={campaignData.filters.companySize}
                      onChange={handleFilterChange}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="ratingMin" className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Rating
                    </label>
                    <input
                      type="number"
                      name="ratingMin"
                      id="ratingMin"
                      min="0"
                      max="5"
                      step="0.1"
                      value={campaignData.filters.ratingMin}
                      onChange={handleFilterChange}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sender Emails */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sender Emails *</h2>
            <p className="text-sm text-gray-500 mb-4">Select the email accounts to send from. You can select multiple.</p>
            {emailAccounts.length === 0 ? (
              <p className="text-sm text-red-600">No connected email accounts. Please connect one in the Email Accounts section.</p>
            ) : (
              <div className="space-y-2">
                {emailAccounts.map(account => (
                  <div key={account.id} className="relative flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id={`sender-email-${account.id}`}
                        name="senderEmails"
                        type="checkbox"
                        checked={campaignData.senderEmails.includes(account.email)}
                        onChange={(e) => handleSenderEmailChange(account.email, e.target.checked)}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor={`sender-email-${account.id}`} className="font-medium text-gray-700">
                        {account.name ? `${account.name} (${account.email})` : account.email}
                      </label>
                      <p className="text-gray-500">Daily Limit: {account.dailyLimit} emails</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campaign Steps */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Campaign Steps</h2>
              <button
                type="button"
                onClick={addStep}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Step
              </button>
            </div>
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div key={step.id} className="border border-gray-200 rounded-md p-4 relative">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Step {step.stepOrder}</h3>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(step.id)}
                      className="absolute top-4 right-4 text-red-600 hover:text-red-900"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject Template *
                      </label>
                      <input
                        type="text"
                        required
                        value={step.subjectTemplate}
                        onChange={(e) => updateStep(step.id, 'subjectTemplate', e.target.value)}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="Enter email subject template. Use {{name}}, {{company}} for personalization."
                      />
                    </div>
                    <div>
                      <label htmlFor={`waitType-${step.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                        Wait For
                      </label>
                      <select
                        id={`waitType-${step.id}`}
                        name="waitType"
                        value={step.waitType}
                        onChange={(e) => updateStep(step.id, 'waitType', e.target.value as 'minutes' | 'hours' | 'days')}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`waitValue-${step.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                        Wait Value
                      </label>
                      <input
                        type="number"
                        id={`waitValue-${step.id}`}
                        name="waitValue"
                        min="1"
                        required
                        value={step.waitValue}
                        onChange={(e) => updateStep(step.id, 'waitValue', parseInt(e.target.value) || 1)}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Body Template *
                    </label>
                    <div className="border border-gray-300 rounded-md">
                      <RichTextEditor
                        value={step.bodyTemplate}
                        onChange={(content) => updateStep(step.id, 'bodyTemplate', content)}
                        placeholder="Enter your email content. Use {{name}}, {{company}} for personalization."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Link
              href={`/campaigns/${params.id}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                'Update Campaign'
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
