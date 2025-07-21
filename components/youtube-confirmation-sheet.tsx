"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface YouTubeConfirmationSheetProps {
  isVisible: boolean
  youtubeUrl: string
  onConfirm: () => void
  onCancel: () => void
}

export function YouTubeConfirmationSheet({ 
  isVisible, 
  youtubeUrl, 
  onConfirm, 
  onCancel 
}: YouTubeConfirmationSheetProps) {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true)
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  const truncateUrl = (url: string) => {
    if (url.length <= 50) return url
    return url.substring(0, 47) + "..."
  }

  if (!shouldRender) return null

  return (
    <div>
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-50 transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        onClick={onCancel}
      />
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 transition-transform duration-300 ease-out",
          isVisible ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="p-6">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {truncateUrl(youtubeUrl)}의<br />
              영상을 조회하시겠어요?
            </h3>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex-1 h-12"
              >
                아니요
              </Button>
              <Button
                onClick={onConfirm}
                className="flex-1 h-12 bg-black hover:bg-gray-800 text-white"
              >
                예
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}