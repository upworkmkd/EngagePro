'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
}

export default function RichTextEditor({ value, onChange, placeholder, height = 200 }: RichTextEditorProps) {
  const [showPreview, setShowPreview] = useState(false)

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean']
    ],
  }

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'align', 'list', 'bullet',
    'blockquote', 'code-block', 'link', 'image'
  ]

  return (
    <div className="border border-gray-300 rounded-md">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-300">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Rich Text Editor</span>
          <span className="text-xs text-gray-500">Tip: Use {'{{name}}'}, {'{{company}}'}, {'{{industry}}'} for personalization</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className={`px-3 py-1 text-xs font-medium rounded ${
              !showPreview 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className={`px-3 py-1 text-xs font-medium rounded ${
              showPreview 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Editor/Preview */}
      <div style={{ height: `${height}px` }}>
        {!showPreview ? (
          <ReactQuill
            theme="snow"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            modules={modules}
            formats={formats}
            style={{ height: `${height - 40}px` }}
          />
        ) : (
          <div 
            className="p-4 overflow-auto"
            style={{ height: `${height - 40}px` }}
            dangerouslySetInnerHTML={{ __html: value }}
          />
        )}
      </div>
    </div>
  )
}
