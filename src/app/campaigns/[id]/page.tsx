'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

interface CampaignStep {
  id: string
  stepOrder: number
  subjectTemplate: string
  bodyTemplate: string
  waitType: string
  waitValue: number
  condition?: string
  createdAt: string
}

interface Campaign {
  id: string
  name: string
  isActive: boolean
  leadSelectionType: string
  selectedLeadPack?: string
  senderEmails: string[]
  createdAt: string
  updatedAt: string
  steps: CampaignStep[]
  filtersJson?: any
}

interface CampaignAnalytics {
  totalLeads: number
  emailsSent: number
  emailsDelivered: number
  emailsOpened: number
  emailsClicked: number
  emailsBounced: number
  openRate: number
  clickRate: number
  bounceRate: number
}

export default function CampaignViewPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user && params.id) {
      fetchCampaign()
      fetchAnalytics()
    }
  }, [user, params.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
        setCampaign(data.campaign)
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

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/analytics`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    }
  }

  const handleStartCampaign = async () => {
    setStarting(true)
    try {
      const response = await fetch(`/api/campaigns/${params.id}/start`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Campaign started successfully!')
        fetchCampaign() // Refresh campaign data
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to start campaign.')
      }
    } catch (error) {
      console.error('Error starting campaign:', error)
      toast.error('An unexpected error occurred.')
    } finally {
      setStarting(false)
    }
  }

  const handleStopCampaign = async () => {
    setStopping(true)
    try {
      const response = await fetch(`/api/campaigns/${params.id}/stop`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Campaign stopped successfully!')
        fetchCampaign() // Refresh campaign data
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to stop campaign.')
      }
    } catch (error) {
      console.error('Error stopping campaign:', error)
      toast.error('An unexpected error occurred.')
    } finally {
      setStopping(false)
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'ACTIVE' : 'INACTIVE'
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
              href="/campaigns"
              className="text-sm font-medium text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Campaigns
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
            <div className="flex items-center mt-2 space-x-4">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.isActive)}`}>
                {getStatusText(campaign.isActive)}
              </span>
              <span className="text-sm text-gray-500">
                Created {new Date(campaign.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/campaigns/${params.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Campaign
            </Link>
            {!campaign.isActive && (
              <button
                onClick={handleStartCampaign}
                disabled={starting}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {starting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Starting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-10a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Campaign
                  </>
                )}
              </button>
            )}
            {campaign.isActive && (
              <button
                onClick={handleStopCampaign}
                disabled={stopping}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {stopping ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Stopping...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                    </svg>
                    Stop Campaign
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Analytics */}
        {analytics && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Leads</dt>
                      <dd className="text-lg font-medium text-gray-900">{analytics.totalLeads}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Emails Sent</dt>
                      <dd className="text-lg font-medium text-gray-900">{analytics.emailsSent}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Open Rate</dt>
                      <dd className="text-lg font-medium text-gray-900">{analytics.openRate.toFixed(1)}%</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Click Rate</dt>
                      <dd className="text-lg font-medium text-gray-900">{analytics.clickRate.toFixed(1)}%</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Steps */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Campaign Steps ({campaign.steps.length})
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Review the email sequence for this campaign.
            </p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-6">
              {campaign.steps.map((step, index) => (
                <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-medium text-gray-900">Step {step.stepOrder}</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        Wait {step.waitValue} {step.waitType}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject
                      </label>
                      <div className="p-3 bg-gray-50 rounded-md border">
                        <p className="text-sm text-gray-900">{step.subjectTemplate}</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Body
                      </label>
                      <div className="p-3 bg-gray-50 rounded-md border max-h-40 overflow-y-auto">
                        <div 
                          className="text-sm text-gray-900 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: step.bodyTemplate }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Campaign Configuration */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Campaign Configuration
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Lead selection and sender email configuration.
            </p>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Lead Selection Type</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{campaign.leadSelectionType}</dd>
              </div>
              
              {campaign.leadSelectionType === 'leadpack' && campaign.selectedLeadPack && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Selected Lead Pack</dt>
                  <dd className="mt-1 text-sm text-gray-900">{campaign.selectedLeadPack}</dd>
                </div>
              )}
              
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Sender Emails</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {campaign.senderEmails.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {campaign.senderEmails.map((email, index) => (
                        <li key={index}>{email}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-500">No sender emails configured</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Targeting Information */}
        {campaign.filtersJson && campaign.leadSelectionType === 'filters' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Targeting Filters
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Lead selection criteria for this campaign.
              </p>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                {campaign.filtersJson.industry && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Industry</dt>
                    <dd className="mt-1 text-sm text-gray-900">{campaign.filtersJson.industry}</dd>
                  </div>
                )}
                {campaign.filtersJson.location && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Location</dt>
                    <dd className="mt-1 text-sm text-gray-900">{campaign.filtersJson.location}</dd>
                  </div>
                )}
                {campaign.filtersJson.companySize && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Company Size</dt>
                    <dd className="mt-1 text-sm text-gray-900">{campaign.filtersJson.companySize}</dd>
                  </div>
                )}
                {campaign.filtersJson.ratingMin && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Minimum Rating</dt>
                    <dd className="mt-1 text-sm text-gray-900">{campaign.filtersJson.ratingMin}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
