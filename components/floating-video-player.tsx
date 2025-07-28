"use client"

import { X, BookOpen } from "lucide-react"
import { useState, useRef, useEffect } from "react"

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
  onExtractRecipe?: () => void
}

export function FloatingVideoPlayer({ isVisible, video, onClose, onExtractRecipe }: FloatingVideoPlayerProps) {
  const [position, setPosition] = useState<'top' | 'bottom'>('top')
  const [isDragging, setIsDragging] = useState(false)
  const dragStartY = useRef(0)

  // 로컬스토리지에서 위치 불러오기
  useEffect(() => {
    const savedPosition = localStorage.getItem('floatingPlayerPosition') as 'top' | 'bottom'
    if (savedPosition) {
      setPosition(savedPosition)
    }
  }, [])

  // 위치 변경 시 저장
  useEffect(() => {
    localStorage.setItem('floatingPlayerPosition', position)
  }, [position])

  if (!isVisible || !video) return null

  const videoId = getVideoId(video.youtubeUrl)
  if (!videoId) return null

  const handleDoubleClick = () => {
    setPosition(prev => prev === 'top' ? 'bottom' : 'top')
  }

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true)
    dragStartY.current = 'touches' in e ? e.touches[0].clientY : e.clientY
  }

  const positionClass = position === 'top' ? 'top-4' : 'bottom-4'

  return (
    <div className={`fixed ${positionClass} left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-black rounded-lg shadow-2xl`}>
      {/* 레시피 추출 버튼 */}
      {onExtractRecipe && (
        <button
          onClick={onExtractRecipe}
          className="absolute -top-2 -right-12 z-10 bg-[#6BA368] hover:bg-[#5a8f57] text-white rounded-full p-1.5 shadow-lg transition-colors"
          title="레시피 추출하기"
          aria-label="레시피 추출하기"
        >
          <BookOpen className="w-4 h-4" />
        </button>
      )}
      
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute -top-2 -right-2 z-10 bg-gray-800 hover:bg-gray-700 text-white rounded-full p-1.5 shadow-lg transition-colors"
        aria-label="플레이어 닫기"
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
      
      {/* 영상 제목 - 드래그 가능한 영역 */}
      <div 
        className="p-3 bg-gray-900 rounded-b-lg cursor-move select-none"
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        title="더블클릭으로 위치 변경"
      >
        <h3 className="text-white text-sm font-medium line-clamp-2">
          {video.title}
        </h3>
      </div>
    </div>
  )
}