"use client"

import { X } from "lucide-react"

// YouTube URL에서 videoId 추출
const getVideoId = (url: string): string | null => {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  const match = url?.match(regex)
  return match ? match[1] : null
}

interface SearchResult {
  videoId: string
  title: string
  channelName: string
  thumbnail: string
  duration?: string
  publishedAt: string
  viewCount?: string
  viewCountFormatted?: string
  youtubeUrl: string
}

interface FloatingVideoPlayerProps {
  isVisible: boolean
  video: SearchResult | null
  onClose: () => void
}

export function FloatingVideoPlayer({ isVisible, video, onClose }: FloatingVideoPlayerProps) {
  if (!isVisible || !video) return null

  const videoId = getVideoId(video.youtubeUrl)
  if (!videoId) return null

  return (
    <div className="fixed top-4 right-4 z-50 w-80 md:w-80 sm:w-72 xs:w-64 bg-black rounded-lg shadow-2xl">
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute -top-2 -right-2 z-10 bg-gray-800 hover:bg-gray-700 text-white rounded-full p-1.5 shadow-lg transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* YouTube 플레이어 영역 */}
      <div className="aspect-video rounded-lg overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      
      {/* 영상 제목 */}
      <div className="p-3 bg-gray-900 rounded-b-lg">
        <h3 className="text-white text-sm font-medium line-clamp-2">
          {video.title}
        </h3>
      </div>
    </div>
  )
}