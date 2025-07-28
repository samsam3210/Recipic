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
  const [position, setPosition] = useState({ x: null as number | null, y: 4 }) // x: null은 오른쪽 정렬 유지
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const playerRef = useRef<HTMLDivElement>(null)

  if (!isVisible || !video) return null

  const videoId = getVideoId(video.youtubeUrl)
  if (!videoId) return null

  // 드래그 시작
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    if (playerRef.current) {
      const rect = playerRef.current.getBoundingClientRect()
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top
      })
    }
  }

  // 드래그 중
  useEffect(() => {
    if (!isDragging) return
    
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      
      // 새 위치 계산
      const newX = clientX - dragOffset.x
      const newY = clientY - dragOffset.y
      
      // 화면 경계 체크
      const maxX = window.innerWidth - (playerRef.current?.offsetWidth || 0)
      const maxY = window.innerHeight - (playerRef.current?.offsetHeight || 0)
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    }
    
    const handleDragEnd = () => {
      setIsDragging(false)
    }
    
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('touchmove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
    document.addEventListener('touchend', handleDragEnd)
    
    return () => {
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('touchmove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
      document.removeEventListener('touchend', handleDragEnd)
    }
  }, [isDragging, dragOffset])

  // 더블클릭/더블탭으로 상단/하단 전환
  const handleDoubleClick = () => {
    const isTop = position.y < window.innerHeight / 2
    setPosition({
      x: position.x,
      y: isTop ? window.innerHeight - (playerRef.current?.offsetHeight || 0) - 16 : 16
    })
  }

  return (
    <div 
      ref={playerRef}
      className={`fixed z-50 bg-black rounded-lg shadow-2xl ${
        position.x === null 
          ? 'right-4 w-[calc(100%-32px)] md:w-96' 
          : 'w-[calc(100%-32px)] md:w-96'
      } ${!isDragging && 'transition-all duration-300'}`}
      style={{
        top: `${position.y}px`,
        left: position.x !== null ? `${position.x}px` : 'auto',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      {/* 레시피 추출 버튼 */}
      {onExtractRecipe && (
        <button
          onClick={onExtractRecipe}
          className="absolute -top-2 -right-14 z-10 bg-[#6BA368] hover:bg-[#5a8f57] text-white rounded-full p-1.5 shadow-lg transition-colors"
          title="레시피 추출하기"
        >
          <BookOpen className="w-4 h-4" />
        </button>
      )}
      
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute -top-2 -right-2 z-10 bg-gray-800 hover:bg-gray-700 text-white rounded-full p-1.5 shadow-lg transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* YouTube 플레이어 */}
      <div className="aspect-video rounded-t-lg overflow-hidden">
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
        onTouchStart={handleDragStart}
        onDoubleClick={handleDoubleClick}
      >
        <h3 className="text-white text-sm font-medium line-clamp-2">
          {video.title}
        </h3>
      </div>
    </div>
  )
}