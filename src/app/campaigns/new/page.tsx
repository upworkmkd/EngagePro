'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import RichTextEditor from '@/components/RichTextEditor'
import { toast } from 'react-hot-toast'

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
  name: string
  dailyLimit: number
  isActive: boolean
}

interface LeadPack {
  id: string
  name: string
  description: string
  leadCount: number
}

export default function NewCampaignPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const [campaignData, setCampaignData] = useState({
    name: '',
    leadSelectionType: 'leadpack' as 'leadpack' | 'filters',
    selectedLeadPack: '',
    filtersJson: {
      industry: '',
      location: '',
      companySize: '',
      ratingMin: 0,
      lastContactedDays: 0
    },
    senderEmails: [] as string[]
  })

  const [steps, setSteps] = useState<CampaignStep[]>([
    {
      id: '1',
      stepOrder: 1,
      subjectTemplate: '',
      bodyTemplate: '',
      waitType: 'minutes',
      waitValue: 60
    }
  ])

  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([])
  const [leadPacks, setLeadPacks] = useState<LeadPack[]>([])

  useEffect(() => {
    checkAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        fetchData()
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

  const fetchData = async () => {
    try {
      const [emailResponse, packsResponse] = await Promise.all([
        fetch('/api/email-accounts'),
        fetch('/api/lead-packs')
      ])

      if (emailResponse.ok) {
        const emailData = await emailResponse.json()
        setEmailAccounts(emailData.emailAccounts || [])
      }

      if (packsResponse.ok) {
        const packsData = await packsResponse.json()
        setLeadPacks(packsData.leadPacks || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load data')
    }
  }

  const addStep = () => {
    const newStep: CampaignStep = {
      id: Date.now().toString(),
      stepOrder: steps.length + 1,
      subjectTemplate: '',
      bodyTemplate: '',
      waitType: 'minutes',
      waitValue: 60
    }
    setSteps([...steps, newStep])
  }

  const removeStep = (stepId: string) => {
    if (steps.length > 1) {
      const updatedSteps = steps.filter(step => step.id !== stepId)
        .map((step, index) => ({ ...step, stepOrder: index + 1 }))
      setSteps(updatedSteps)
    }
  }

  const updateStep = (stepId: string, field: keyof CampaignStep, value: any) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, [field]: value } : step
    ))
  }

  const handleSenderEmailToggle = (emailId: string) => {
    setCampaignData(prev => ({
      ...prev,
      senderEmails: prev.senderEmails.includes(emailId)
        ? prev.senderEmails.filter(id => id !== emailId)
        : [...prev.senderEmails, emailId]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (campaignData.senderEmails.length === 0) {
      toast.error('Please select at least one sender email')
      return
    }

    if (campaignData.leadSelectionType === 'leadpack' && !campaignData.selectedLeadPack) {
      toast.error('Please select a lead pack')
      return
    }

    // Check for existing campaigns with the same name
    try {
      const response = await fetch('/api/campaigns')
      if (response.ok) {
        const data = await response.json()
        const existingCampaign = data.campaigns.find((c: any) => c.name === campaignData.name)
        if (existingCampaign) {
          toast.error('A campaign with this name already exists. Please choose a different name.')
          return
        }
      }
    } catch (error) {
      console.error('Error checking existing campaigns:', error)
    }

    setSaving(true)

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...campaignData,
          steps: steps.map(step => ({
            stepOrder: step.stepOrder,
            subjectTemplate: step.subjectTemplate,
            bodyTemplate: step.bodyTemplate,
            waitType: step.waitType,
            waitValue: step.waitValue,
            condition: step.condition
          }))
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Campaign created successfully!')
        router.push('/campaigns')
      } else {
        // Handle specific error cases
        if (data.details && data.details.some((detail: any) => detail.path.includes('name'))) {
          toast.error('A campaign with this name already exists. Please choose a different name.')
        } else {
          toast.error(data.error || 'Failed to create campaign')
        }
      }
    } catch (error) {
      toast.error('An error occurred while creating the campaign')
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

  if (!user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Campaigns
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Create New Campaign
          </h1>
          <p className="text-gray-600 mt-2">
            Set up your email marketing campaign with advanced targeting and multi-step sequences.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Campaign Basic Info */}
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Campaign Information</h3>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={campaignData.name}
                  onChange={(e) => setCampaignData({...campaignData, name: e.target.value})}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="e.g., Q4 Lead Generation Campaign"
                />
              </div>
            </div>
          </div>

          {/* Lead Selection */}
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Lead Selection</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">Select Lead Source</label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="relative flex cursor-pointer rounded-lg p-4 focus:outline-none">
                    <input
                      type="radio"
                      name="leadSelectionType"
                      value="leadpack"
                      checked={campaignData.leadSelectionType === 'leadpack'}
                      onChange={(e) => setCampaignData({...campaignData, leadSelectionType: e.target.value as 'leadpack'})}
                      className="sr-only"
                    />
                    <span className={`flex flex-1 rounded-lg border-2 p-4 ${
                      campaignData.leadSelectionType === 'leadpack' 
                        ? 'border-indigo-600 bg-indigo-50' 
                        : 'border-gray-200 bg-white'
                    }`}>
                      <span className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">Lead Pack</span>
                        <span className="text-sm text-gray-500">Use pre-organized lead groups</span>
                      </span>
                    </span>
                  </label>
                  
                  <label className="relative flex cursor-pointer rounded-lg p-4 focus:outline-none">
                    <input
                      type="radio"
                      name="leadSelectionType"
                      value="filters"
                      checked={campaignData.leadSelectionType === 'filters'}
                      onChange={(e) => setCampaignData({...campaignData, leadSelectionType: e.target.value as 'filters'})}
                      className="sr-only"
                    />
                    <span className={`flex flex-1 rounded-lg border-2 p-4 ${
                      campaignData.leadSelectionType === 'filters' 
                        ? 'border-indigo-600 bg-indigo-50' 
                        : 'border-gray-200 bg-white'
                    }`}>
                      <span className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">Filters</span>
                        <span className="text-sm text-gray-500">Target leads with specific criteria</span>
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {campaignData.leadSelectionType === 'leadpack' && (
                <div>
                  <label htmlFor="leadPack" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Lead Pack *
                  </label>
                  <select
                    id="leadPack"
                    value={campaignData.selectedLeadPack}
                    onChange={(e) => setCampaignData({...campaignData, selectedLeadPack: e.target.value})}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  >
                    <option value="">Choose a lead pack</option>
                    {leadPacks.map((pack) => (
                      <option key={pack.id} value={pack.id}>
                        {pack.name} ({pack.leadCount} leads)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {campaignData.leadSelectionType === 'filters' && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Targeting Filters</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                        Industry
                      </label>
                      <input
                        type="text"
                        id="industry"
                        value={campaignData.filtersJson.industry}
                        onChange={(e) => setCampaignData({
                          ...campaignData, 
                          filtersJson: {...campaignData.filtersJson, industry: e.target.value}
                        })}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="e.g., Technology"
                      />
                    </div>
                    <div>
                      <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        id="location"
                        value={campaignData.filtersJson.location}
                        onChange={(e) => setCampaignData({
                          ...campaignData, 
                          filtersJson: {...campaignData.filtersJson, location: e.target.value}
                        })}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="e.g., San Francisco"
                      />
                    </div>
                    <div>
                      <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-2">
                        Company Size
                      </label>
                      <select
                        id="companySize"
                        value={campaignData.filtersJson.companySize}
                        onChange={(e) => setCampaignData({
                          ...campaignData, 
                          filtersJson: {...campaignData.filtersJson, companySize: e.target.value}
                        })}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      >
                        <option value="">Any Size</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-500">201-500 employees</option>
                        <option value="500+">500+ employees</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sender Email Selection */}
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Sender Email Accounts</h3>
            
            {emailAccounts.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h4 className="mt-2 text-sm font-medium text-gray-900">No email accounts</h4>
                <p className="mt-1 text-sm text-gray-500">
                  Connect your email accounts to send campaigns.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => router.push('/email-accounts')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Connect Email Accounts
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Select one or more email accounts to use for this campaign:</p>
                <div className="grid gap-4">
                  {emailAccounts.map((account) => (
                    <label key={account.id} className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={campaignData.senderEmails.includes(account.id)}
                          onChange={() => handleSenderEmailToggle(account.id)}
                          className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{account.name || account.email}</div>
                            <div className="text-gray-500">{account.email}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">Daily limit: {account.dailyLimit}</div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              account.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {account.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Email Steps */}
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Campaign Steps</h3>
              <button
                type="button"
                onClick={addStep}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Step
              </button>
            </div>

            <div className="space-y-8">
              {steps.map((step, index) => (
                <div key={step.id} className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-indigo-600">{step.stepOrder}</span>
                      </div>
                      <h4 className="ml-3 text-lg font-medium text-gray-900">
                        Step {step.stepOrder}: Email {step.stepOrder}
                      </h4>
                    </div>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(step.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject Template *
                      </label>
                      <input
                        type="text"
                        required
                        value={step.subjectTemplate}
                        onChange={(e) => updateStep(step.id, 'subjectTemplate', e.target.value)}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="Enter email subject template (use {{name}}, {{company}} for personalization)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Body Template *
                      </label>
                      <RichTextEditor
                        value={step.bodyTemplate}
                        onChange={(value) => updateStep(step.id, 'bodyTemplate', value)}
                        placeholder="Enter your email template. Use {{name}}, {{company}}, {{industry}} for personalization."
                        height={300}
                      />
                    </div>

                    {index < steps.length - 1 && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Wait Time
                          </label>
                          <div className="flex space-x-2">
                            <input
                              type="number"
                              min="1"
                              value={step.waitValue}
                              onChange={(e) => updateStep(step.id, 'waitValue', parseInt(e.target.value) || 1)}
                              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            />
                            <select
                              value={step.waitType}
                              onChange={(e) => updateStep(step.id, 'waitType', e.target.value as 'minutes' | 'hours' | 'days')}
                              className="px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            >
                              <option value="minutes">Minutes</option>
                              <option value="hours">Hours</option>
                              <option value="days">Days</option>
                            </select>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            Wait time before sending the next email in the sequence
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Campaign...
                </>
              ) : (
                'Create Campaign'
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}