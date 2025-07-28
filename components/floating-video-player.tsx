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
  const [dragStartY, setDragStartY] = useState(0)

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

  // 더블클릭/더블탭 핸들러
  const handleDoubleClick = () => {
    setPosition(prev => prev === 'top' ? 'bottom' : 'top')
  }

  // 드래그 시작
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true)
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setDragStartY(clientY)
  }

  // 드래그 종료
  const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return
    
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY
    const dragDistance = clientY - dragStartY
    
    // 50px 이상 드래그하면 위치 변경
    if (Math.abs(dragDistance) > 50) {
      setPosition(dragDistance > 0 ? 'bottom' : 'top')
    }
    
    setIsDragging(false)
  }

  const positionClass = position === 'top' ? 'top-4' : 'bottom-4'

  return (
    <div className={`fixed ${positionClass} left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-black rounded-lg shadow-2xl transition-all ${isDragging ? '' : 'transition-all'}`}>
      {/* 레시피 추출 버튼 */}
      {onExtractRecipe && (
        <button
          onClick={onExtractRecipe}
          className="absolute -top-2 -right-14 z-10 bg-[#6BA368] hover:bg-[#5a8f57] text-white rounded-full p-1.5 shadow-lg transition-colors"
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
      
      {/* 드래그 핸들 (제목 영역) */}
      <div 
        className="p-3 bg-gray-900 rounded-b-lg cursor-move select-none"
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
        onDoubleClick={handleDoubleClick}
        title="더블클릭으로 위치 변경"
      >
        <h3 className="text-white text-sm font-medium line-clamp-2">
          {video.title}
        </h3>
      </div>
    </div>
  )
}