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
  // 상태 관리 단순화 - 상하 이동만 가능하도록
  const [positionY, setPositionY] = useState(16) // Y 위치만 관리 (상단에서부터의 거리)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const playerRef = useRef<HTMLDivElement>(null)

  // 더블클릭 핸들러 수정
  const handleDoubleClick = () => {
    const isTop = positionY < window.innerHeight / 2
    const bottomPosition = window.innerHeight - (playerRef.current?.offsetHeight || 0) - 20
    setPositionY(isTop ? bottomPosition : 16)
  }

  // 드래그 핸들러 수정 - 상하 이동만 처리
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation() // 배경 페이지 간섭 방지
    setIsDragging(true)
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setDragStartY(clientY - positionY)
    
    // 드래그 중 텍스트 선택 방지
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
  }

  useEffect(() => {
    if (!isDragging) return
    
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      const newY = clientY - dragStartY
      
      // 화면 경계 체크 (상하만)
      const maxY = window.innerHeight - (playerRef.current?.offsetHeight || 0) - 20
      setPositionY(Math.max(16, Math.min(newY, maxY)))
    }
    
    const handleDragEnd = () => {
      setIsDragging(false)
      // 텍스트 선택 복원
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
    }
    
    // 이벤트 리스너에 passive: false 추가하여 preventDefault 작동 보장
    document.addEventListener('mousemove', handleDragMove, { passive: false })
    document.addEventListener('touchmove', handleDragMove, { passive: false })
    document.addEventListener('mouseup', handleDragEnd)
    document.addEventListener('touchend', handleDragEnd)
    
    return () => {
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('touchmove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
      document.removeEventListener('touchend', handleDragEnd)
    }
  }, [isDragging, dragStartY])

  // 조건부 렌더링은 모든 Hook 이후에
  if (!isVisible || !video) return null

  const videoId = getVideoId(video.youtubeUrl)
  if (!videoId) return null

  // 컴포넌트 렌더링 수정 - 항상 중앙 정렬
  return (
    <div 
      ref={playerRef}
      className={`fixed left-1/2 transform -translate-x-1/2 z-[60] bg-black rounded-lg shadow-2xl w-[calc(100%-32px)] md:w-[450px] ${!isDragging && 'transition-all duration-300'}`}
      style={{
        top: `${positionY}px`,
        cursor: isDragging ? 'grabbing' : 'auto',
        touchAction: 'none' // 터치 스크롤 방지
      }}
    >
      {/* 레시피 추출 버튼 - 위치 조정 */}
      {onExtractRecipe && (
        <button
          onClick={onExtractRecipe}
          className="absolute -top-3 right-10 z-10 bg-[#6BA368] hover:bg-[#5a8f57] text-white rounded-full p-1.5 shadow-lg transition-colors"
          title="레시피 추출하기"
        >
          <BookOpen className="w-4 h-4" />
        </button>
      )}
      
      {/* 닫기 버튼 - 위치 조정 */}
      <button
        onClick={onClose}
        className="absolute -top-3 -right-2 z-10 bg-gray-800 hover:bg-gray-700 text-white rounded-full p-1.5 shadow-lg transition-colors"
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