"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { X, Play, Pause, SkipBack, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useYoutubePlayer } from "@/hooks/use-youtube-player"
import { cn } from "@/lib/utils"

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
  const playerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const { youtubePlayer, isPlayerReady } = useYoutubePlayer({
    videoId: video?.videoId || null,
    playerRef,
    onReady: (player) => {
      console.log("[FloatingVideoPlayer] Player ready")
      setDuration(player.getDuration())
      
      // 플레이어 상태 변경 감지
      const checkPlayerState = () => {
        if (player && typeof player.getPlayerState === 'function') {
          const state = player.getPlayerState()
          setIsPlaying(state === 1) // YT.PlayerState.PLAYING
          setCurrentTime(player.getCurrentTime())
        }
      }
      
      // 주기적으로 상태 확인
      const interval = setInterval(checkPlayerState, 1000)
      return () => clearInterval(interval)
    },
    onError: (error) => {
      console.error("[FloatingVideoPlayer] Player error:", error)
    }
  })

  // ESC 키 및 배경 클릭으로 닫기
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isVisible) {
      onClose()
    }
  }, [isVisible, onClose])

  const handleBackgroundClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }, [onClose])

  // 키보드 이벤트 리스너 등록
  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden' // 스크롤 방지
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isVisible, handleKeyDown])

  // 플레이어 컨트롤 함수들
  const togglePlayPause = useCallback(() => {
    if (!youtubePlayer || !isPlayerReady) return
    
    if (isPlaying) {
      youtubePlayer.pauseVideo()
    } else {
      youtubePlayer.playVideo()
    }
  }, [youtubePlayer, isPlayerReady, isPlaying])

  const skipBackward = useCallback(() => {
    if (!youtubePlayer || !isPlayerReady) return
    
    const newTime = Math.max(0, currentTime - 10)
    youtubePlayer.seekTo(newTime, true)
  }, [youtubePlayer, isPlayerReady, currentTime])

  const skipForward = useCallback(() => {
    if (!youtubePlayer || !isPlayerReady) return
    
    const newTime = Math.min(duration, currentTime + 10)
    youtubePlayer.seekTo(newTime, true)
  }, [youtubePlayer, isPlayerReady, currentTime, duration])

  if (!isVisible || !video) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm",
        "animate-in fade-in-0 duration-300"
      )}
      onClick={handleBackgroundClick}
    >
      <div
        className={cn(
          "relative w-full max-w-2xl mx-4 bg-black rounded-lg overflow-hidden shadow-2xl",
          "animate-in zoom-in-95 duration-300"
        )}
      >
        {/* 닫기 버튼 */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        {/* YouTube 플레이어 */}
        <div className="relative aspect-video bg-black">
          <div
            ref={playerRef}
            className="absolute inset-0"
          />
          
          {!isPlayerReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          )}
        </div>

        {/* 영상 정보 및 컨트롤 */}
        <div className="p-4 bg-gray-900 text-white">
          {/* 영상 제목 */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold line-clamp-2 mb-1">
              {video.title}
            </h3>
            <p className="text-sm text-gray-400">
              {video.channelName}
            </p>
          </div>

          {/* 컨트롤 버튼들 */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={skipBackward}
              disabled={!isPlayerReady}
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon" 
              className="text-white hover:bg-white/20 w-12 h-12"
              onClick={togglePlayPause}
              disabled={!isPlayerReady}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={skipForward}
              disabled={!isPlayerReady}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          {/* 시간 정보 */}
          {isPlayerReady && duration > 0 && (
            <div className="mt-3 text-center text-sm text-gray-400">
              {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}