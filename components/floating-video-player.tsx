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
  // 1. 모든 상태와 ref 선언
  const [position, setPosition] = useState({ x: null as number | null, y: 4 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const playerRef = useRef<HTMLDivElement>(null)

  // 2. 더블클릭 핸들러 (useEffect 밖으로 이동)
  const handleDoubleClick = () => {
    const isTop = position.y < window.innerHeight / 2
    setPosition({
      x: position.x,
      y: isTop ? window.innerHeight - (playerRef.current?.offsetHeight || 0) - 16 : 16
    })
  }

  // 3. 드래그 시작 핸들러
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

  // 4. useEffect는 조건부 return 이전에 위치
  useEffect(() => {
    if (!isDragging) return
    
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      
      const newX = clientX - dragOffset.x
      const newY = clientY - dragOffset.y
      
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

  // 5. 조건부 렌더링은 모든 Hook 이후에
  if (!isVisible || !video) return null

  const videoId = getVideoId(video.youtubeUrl)
  if (!videoId) return null

  // 6. JSX 렌더링
  return (
    <div 
      ref={playerRef}
      className={`fixed z-50 bg-black rounded-lg shadow-2xl ${
        position.x === null 
          ? 'left-4 right-4 md:left-auto md:right-4 md:w-96' 
          : ''
      } ${!isDragging && 'transition-all duration-300'}`}
      style={{
        top: `${position.y}px`,
        left: position.x !== null ? `${position.x}px` : 'auto',
        width: position.x !== null ? (window.innerWidth < 768 ? 'calc(100% - 32px)' : '384px') : 'auto',
      }}
    >
      {/* 레시피 추출 버튼 */}
      {onExtractRecipe && (
        <button
          onClick={onExtractRecipe}
          className="absolute -top-2 right-8 z-10 bg-[#6BA368] hover:bg-[#5a8f57] text-white rounded-full p-1.5 shadow-lg transition-colors"
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