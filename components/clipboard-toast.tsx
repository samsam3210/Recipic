"use client"

import { useEffect, useState } from "react"
import { CheckCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ClipboardToastProps {
  isVisible: boolean
  onClose: () => void
  message: string
}

export function ClipboardToast({ isVisible, onClose, message }: ClipboardToastProps) {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true)
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  if (!shouldRender) return null

  return (
    <div>
      {/* 데스크톱 토스트 */}
      <div
        className={cn(
          "fixed top-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-in-out hidden md:block",
          isVisible 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 -translate-y-2"
        )}
      >
        <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 max-w-fit">
          <div className="flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700 whitespace-nowrap">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
  
      {/* 모바일/태블릿 토스트 */}
      <div
        className={cn(
          "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-in-out md:hidden px-4",
          isVisible 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-2"
        )}
      >
        <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 max-w-fit">
          <div className="flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700 whitespace-nowrap">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )}