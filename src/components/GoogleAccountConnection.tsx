'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'

interface EmailAccount {
  id: string
  email: string
  provider: string
  isActive: boolean
  createdAt: string
}

export default function GoogleAccountConnection() {
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    fetchEmailAccounts()
  }, [])

  const fetchEmailAccounts = async () => {
    try {
      const response = await fetch('/api/email-accounts')
      if (response.ok) {
        const data = await response.json()
        setEmailAccounts(data.emailAccounts || [])
      }
    } catch (error) {
      console.error('Failed to fetch email accounts:', error)
    }
  }

  const connectGoogleAccount = async () => {
    setConnecting(true)
    try {
      const response = await fetch('/api/email-accounts/connect')
      if (response.ok) {
        const data = await response.json()
        // Redirect to Google OAuth
        window.location.href = data.authUrl
      } else {
        toast.error('Failed to initiate Google connection')
      }
    } catch (error) {
      toast.error('An error occurred while connecting to Google')
    } finally {
      setConnecting(false)
    }
  }

  const disconnectAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/email-accounts/${accountId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        toast.success('Account disconnected successfully')
        fetchEmailAccounts()
      } else {
        toast.error('Failed to disconnect account')
      }
    } catch (error) {
      toast.error('An error occurred while disconnecting the account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Connected Email Accounts
        </h3>
        <button
          onClick={connectGoogleAccount}
          disabled={connecting}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {connecting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connect Google Account
            </>
          )}
        </button>
      </div>

      {emailAccounts.length === 0 ? (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No email accounts</h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect a Google account to start sending emails.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {emailAccounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{account.email}</p>
                  <p className="text-sm text-gray-500">
                    {account.provider} • {account.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => disconnectAccount(account.id)}
                disabled={loading}
                className="text-red-600 hover:text-red-900 text-sm font-medium disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
