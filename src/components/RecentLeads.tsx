'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Lead {
  id: string
  name: string
  email?: string
  city?: string
  country: string
  category?: string
  createdAt: string
  _count: {
    activities: number
  }
}

export default function RecentLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads?limit=5')
      const data = await response.json()
      setLeads(data.leads || [])
    } catch (error) {
      console.error('Failed to fetch leads:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Leads</h3>
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
        <h3 className="text-lg font-medium text-gray-900">Recent Leads</h3>
        <Link
          href="/leads"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 mb-4">No leads yet</p>
          <Link
            href="/leads/import"
            className="btn btn-primary"
          >
            Import your first leads
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <Link
                  href={`/leads/${lead.id}`}
                  className="font-medium text-gray-900 hover:text-primary-600"
                >
                  {lead.name}
                </Link>
                <div className="flex items-center mt-1 space-x-2">
                  {lead.email && (
                    <span className="text-sm text-gray-500">{lead.email}</span>
                  )}
                  {lead.city && (
                    <span className="text-sm text-gray-500">• {lead.city}</span>
                  )}
                  <span className="text-sm text-gray-500">• {lead.country}</span>
                </div>
                {lead.category && (
                  <span className="badge badge-info mt-1">{lead.category}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-500">
                  {lead._count.activities} activities
                </span>
                <div className="text-xs text-gray-400">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
