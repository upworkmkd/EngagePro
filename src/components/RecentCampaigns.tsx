'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Campaign {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  _count: {
    runs: number
  }
}

export default function RecentCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns?limit=5')
      const data = await response.json()
      setCampaigns(data.campaigns || [])
    } catch (error) {
      console.error('Failed to fetch campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Campaigns</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Recent Campaigns</h3>
        <Link
          href="/campaigns"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 mb-4">No campaigns yet</p>
          <Link
            href="/campaigns/new"
            className="btn btn-primary"
          >
            Create your first campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <Link
                  href={`/campaigns/${campaign.id}`}
                  className="font-medium text-gray-900 hover:text-primary-600"
                >
                  {campaign.name}
                </Link>
                <div className="flex items-center mt-1 space-x-2">
                  <span className={`badge ${campaign.isActive ? 'badge-success' : 'badge-warning'}`}>
                    {campaign.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {campaign._count.runs} runs
                  </span>
                </div>
              </div>
              <span className="text-sm text-gray-500">
                {new Date(campaign.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
