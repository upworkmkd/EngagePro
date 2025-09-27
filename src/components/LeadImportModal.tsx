'use client'

import { useState, useRef } from 'react'
import { toast } from 'react-hot-toast'

interface LeadImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  leadPacks: Array<{
    id: string
    name: string
    description: string
    leadCount: number
  }>
}

interface CSVRow {
  [key: string]: string
}

interface FieldMapping {
  [csvColumn: string]: string
}

export default function LeadImportModal({ isOpen, onClose, onSuccess, leadPacks }: LeadImportModalProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'results'>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [selectedLeadPack, setSelectedLeadPack] = useState('')
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({})
  const [loading, setLoading] = useState(false)
  const [importResults, setImportResults] = useState<{
    imported: number
    skipped: number
    errors: Array<{ row: number, email: string, error: string }>
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const predefinedFields = [
    { value: 'name', label: 'Name', required: true },
    { value: 'email', label: 'Email', required: true },
    { value: 'phone', label: 'Phone', required: true },
    { value: 'category', label: 'Category', required: false },
    { value: 'address', label: 'Address', required: false },
    { value: 'website', label: 'Website', required: false },
    { value: 'country', label: 'Country', required: false },
    { value: 'city', label: 'City', required: false },
    { value: 'region', label: 'Region', required: false },
    { value: 'rating', label: 'Rating', required: false },
    { value: 'reviewsCount', label: 'Reviews Count', required: false },
  ]

  const parseCSV = (csvText: string): { headers: string[], data: CSVRow[] } => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length === 0) return { headers: [], data: [] }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const row: CSVRow = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      return row
    }).filter(row => Object.values(row).some(value => value.trim() !== ''))

    return { headers, data }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    setSelectedFile(file)
    setLoading(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      const csvText = e.target?.result as string
      const { headers, data } = parseCSV(csvText)
      
      setHeaders(headers)
      setCsvData(data)
      
      // Auto-map common fields
      const autoMapping: FieldMapping = {}
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase()
        if (lowerHeader.includes('name') && !lowerHeader.includes('company') && !lowerHeader.includes('category')) {
          autoMapping[header] = 'name'
        } else if (lowerHeader.includes('email')) {
          autoMapping[header] = 'email'
        } else if (lowerHeader.includes('company') || lowerHeader.includes('category')) {
          autoMapping[header] = 'category'
        } else if (lowerHeader.includes('industry')) {
          autoMapping[header] = 'category'
        } else if (lowerHeader.includes('location') || lowerHeader.includes('address')) {
          autoMapping[header] = 'address'
        } else if (lowerHeader.includes('phone')) {
          autoMapping[header] = 'phone'
        } else if (lowerHeader.includes('website') || lowerHeader.includes('url')) {
          autoMapping[header] = 'website'
        } else if (lowerHeader.includes('country')) {
          autoMapping[header] = 'country'
        } else if (lowerHeader.includes('city')) {
          autoMapping[header] = 'city'
        } else if (lowerHeader.includes('region') || lowerHeader.includes('state')) {
          autoMapping[header] = 'region'
        } else if (lowerHeader.includes('rating') || lowerHeader.includes('score')) {
          autoMapping[header] = 'rating'
        } else if (lowerHeader.includes('review') && lowerHeader.includes('count')) {
          autoMapping[header] = 'reviewsCount'
        }
      })
      
      setFieldMapping(autoMapping)
      setStep('mapping')
      setLoading(false)
    }

    reader.readAsText(file)
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleImport = async () => {
    if (!selectedLeadPack) {
      toast.error('Please select a lead pack')
      return
    }

    // Validate required fields
    const requiredFields = predefinedFields.filter(f => f.required)
    const mappedRequiredFields = requiredFields.map(f => f.value)
    const mappedFields = Object.values(fieldMapping)
    
    const missingRequiredFields = mappedRequiredFields.filter(field => !mappedFields.includes(field))
    if (missingRequiredFields.length > 0) {
      toast.error(`Missing required fields: ${missingRequiredFields.join(', ')}`)
      return
    }

    setLoading(true)
    try {
      // Validate and prepare data
      const mappedData: any[] = []
      const errors: Array<{ row: number, email: string, error: string }> = []

      csvData.forEach((row, index) => {
        const lead: any = {}
        let hasError = false
        let errorMessage = ''

        // Map fields
        Object.entries(fieldMapping).forEach(([csvColumn, leadField]) => {
          if (leadField && row[csvColumn]) {
            lead[leadField] = row[csvColumn].trim()
          }
        })

        // Validate required fields
        if (!lead.name || lead.name.trim() === '') {
          hasError = true
          errorMessage = 'Name is required'
        } else if (!lead.email || lead.email.trim() === '') {
          hasError = true
          errorMessage = 'Email is required'
        } else if (!validateEmail(lead.email)) {
          hasError = true
          errorMessage = 'Invalid email format'
        } else if (!lead.phone || lead.phone.trim() === '') {
          hasError = true
          errorMessage = 'Phone is required'
        }

        if (hasError) {
          errors.push({
            row: index + 2, // +2 because CSV is 1-indexed and we skip header
            email: lead.email || 'N/A',
            error: errorMessage
          })
        } else {
          mappedData.push(lead)
        }
      })

      if (mappedData.length === 0) {
        setImportResults({
          imported: 0,
          skipped: 0,
          errors
        })
        setStep('results')
        setLoading(false)
        return
      }

      // Import valid leads
      const response = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: mappedData,
          leadPackId: selectedLeadPack
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        setImportResults({
          imported: result.imported || mappedData.length,
          skipped: result.skipped || 0,
          errors
        })
        setStep('results')
        
        if (result.imported > 0) {
          toast.success(`Successfully imported ${result.imported} leads!`)
        }
      } else {
        // Handle API errors
        const apiErrors = result.details || []
        const combinedErrors = [...errors, ...apiErrors.map((err: any) => ({
          row: err.path[1] + 2, // Convert array index to row number
          email: csvData[err.path[1]]?.[Object.keys(fieldMapping).find(key => fieldMapping[key] === 'email') || ''] || 'N/A',
          error: err.message
        }))]

        setImportResults({
          imported: 0,
          skipped: 0,
          errors: combinedErrors
        })
        setStep('results')
      }
    } catch (error) {
      console.error('Error importing leads:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetModal = () => {
    setStep('upload')
    setSelectedFile(null)
    setCsvData([])
    setHeaders([])
    setSelectedLeadPack('')
    setFieldMapping({})
    setImportResults(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const goBack = () => {
    if (step === 'mapping') {
      setStep('upload')
    } else if (step === 'preview') {
      setStep('mapping')
    } else if (step === 'results') {
      setStep('preview')
    }
  }

  const handleClose = () => {
    if (!loading) {
      resetModal()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative inline-block transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6 sm:align-middle">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Import Leads from CSV
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Upload a CSV file and map the columns to import your leads.
                </p>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mt-6">
            <div className="flex items-center justify-center space-x-2">
              <div className={`flex items-center ${step === 'upload' ? 'text-indigo-600' : ['mapping', 'preview', 'results'].includes(step) ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'upload' ? 'bg-indigo-100 text-indigo-600' : ['mapping', 'preview', 'results'].includes(step) ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  1
                </div>
                <span className="ml-2 text-sm font-medium hidden sm:block">Upload CSV</span>
              </div>
              <div className={`flex-1 h-0.5 ${['mapping', 'preview', 'results'].includes(step) ? 'bg-green-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center ${step === 'mapping' ? 'text-indigo-600' : ['preview', 'results'].includes(step) ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'mapping' ? 'bg-indigo-100 text-indigo-600' : ['preview', 'results'].includes(step) ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  2
                </div>
                <span className="ml-2 text-sm font-medium hidden sm:block">Map Fields</span>
              </div>
              <div className={`flex-1 h-0.5 ${['preview', 'results'].includes(step) ? 'bg-green-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center ${step === 'preview' ? 'text-indigo-600' : step === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'preview' ? 'bg-indigo-100 text-indigo-600' : step === 'results' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  3
                </div>
                <span className="ml-2 text-sm font-medium hidden sm:block">Import</span>
              </div>
              <div className={`flex-1 h-0.5 ${step === 'results' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center ${step === 'results' ? 'text-indigo-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 'results' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                  4
                </div>
                <span className="ml-2 text-sm font-medium hidden sm:block">Results</span>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="mt-8">
            {step === 'upload' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="lead-pack" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Lead Pack
                  </label>
                  <select
                    id="lead-pack"
                    value={selectedLeadPack}
                    onChange={(e) => setSelectedLeadPack(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Choose a lead pack</option>
                    {leadPacks.map((pack) => (
                      <option key={pack.id} value={pack.id}>
                        {pack.name} ({pack.leadCount} leads)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload CSV File
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                    <div className="space-y-1 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="csv-file" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                          <span>Upload a file</span>
                          <input
                            ref={fileInputRef}
                            id="csv-file"
                            name="csv-file"
                            type="file"
                            accept=".csv"
                            className="sr-only"
                            onChange={handleFileUpload}
                            disabled={loading}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">CSV files only</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'mapping' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Map CSV Columns to Lead Fields</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Match your CSV columns to the appropriate lead fields. Required fields are marked with *.
                  </p>
                </div>

                <div className="grid gap-4">
                  {headers.map((header) => (
                    <div key={header} className="flex items-center space-x-4">
                      <div className="w-1/3">
                        <label className="block text-sm font-medium text-gray-700">
                          CSV Column: <span className="font-mono text-indigo-600">{header}</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Sample: {csvData[0]?.[header] || 'No data'}
                        </p>
                      </div>
                      <div className="w-1/3">
                        <select
                          value={fieldMapping[header] || ''}
                          onChange={(e) => setFieldMapping({...fieldMapping, [header]: e.target.value})}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                          <option value="">Skip this column</option>
                          {predefinedFields.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label} {field.required && '*'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-1/3">
                        {fieldMapping[header] && (
                          <span className="text-sm text-green-600">
                            ✓ Mapped to {predefinedFields.find(f => f.value === fieldMapping[header])?.label}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => setStep('preview')}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Continue to Preview
                  </button>
                </div>
              </div>
            )}

            {step === 'preview' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Preview Import</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Review the data before importing. {csvData.length} leads will be imported to the selected lead pack.
                  </p>
                </div>

                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.values(fieldMapping).filter(Boolean).map((field) => (
                          <th key={field} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {predefinedFields.find(f => f.value === field)?.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {csvData.slice(0, 5).map((row, index) => (
                        <tr key={index}>
                          {Object.values(fieldMapping).filter(Boolean).map((field) => (
                            <td key={field} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                              {Object.entries(fieldMapping).find(([_, f]) => f === field)?.[0] && 
                               row[Object.entries(fieldMapping).find(([_, f]) => f === field)?.[0] || '']
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvData.length > 5 && (
                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                      ... and {csvData.length - 5} more rows
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 'results' && importResults && (
              <div className="space-y-6">
                <div className="text-center">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Import Results</h4>
                  <p className="text-sm text-gray-600">
                    Import process completed. Here's a summary of the results.
                  </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">Imported</p>
                        <p className="text-2xl font-bold text-green-900">{importResults.imported}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-800">Skipped</p>
                        <p className="text-2xl font-bold text-blue-900">{importResults.skipped}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800">Errors</p>
                        <p className="text-2xl font-bold text-red-900">{importResults.errors.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error Details */}
                {importResults.errors.length > 0 && (
                  <div className="border border-red-200 rounded-lg">
                    <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                      <h5 className="text-sm font-medium text-red-800">Import Errors</h5>
                      <p className="text-sm text-red-600">The following rows could not be imported:</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {importResults.errors.map((error, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{error.row}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{error.email}</td>
                              <td className="px-4 py-2 text-sm text-red-600">{error.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {importResults.imported > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">
                          Successfully imported {importResults.imported} leads to the selected lead pack!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="mt-6 sm:flex sm:flex-row-reverse">
            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={loading}
                className="inline-flex w-full justify-center rounded-lg border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                  </>
                ) : (
                  `Import ${csvData.length} Leads`
                )}
              </button>
            )}
            {step === 'results' && (
              <button
                onClick={() => {
                  onSuccess()
                  handleClose()
                }}
                className="inline-flex w-full justify-center rounded-lg border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
              >
                Done
              </button>
            )}
            <button
              type="button"
              onClick={step === 'upload' ? handleClose : goBack}
              disabled={loading}
              className="mt-3 inline-flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {step === 'upload' ? 'Cancel' : 'Back'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
