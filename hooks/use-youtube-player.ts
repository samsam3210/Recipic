"use client"

import type React from "react"

import { useState, useEffect } from "react"

// YouTube IFrame Player API 타입 정의 (이전 배포 오류 해결을 위해 직접 정의)
declare global {
  interface Window {
    YT: {
      Player: new (element: HTMLElement | string, options: YT.PlayerOptions) => YT.Player
      PlayerState: {
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

namespace YT {
  export interface Player {
    playVideo(): void
    pauseVideo(): void
    stopVideo(): void
    seekTo(seconds: number, allowSeekAhead: boolean): void
    getDuration(): number
    getCurrentTime(): number
    getPlayerState(): number
    destroy(): void
    // 필요한 다른 메서드 추가
  }

  export interface PlayerOptions {
    height?: string
    width?: string
    videoId?: string
    playerVars?: {
      autoplay?: 0 | 1
      controls?: 0 | 1
      rel?: 0 | 1
      modestbranding?: 0 | 1
      enablejsapi?: 0 | 1
      origin?: string
      // 필요한 다른 playerVars 추가
    }
    events?: {
      onReady?: (event: { target: Player }) => void
      onStateChange?: (event: { data: number; target: Player }) => void
      onError?: (event: { data: number; target: Player }) => void
      // 필요한 다른 이벤트 추가
    }
  }
}

interface UseYoutubePlayerOptions {
  videoId: string | null
  playerRef: React.RefObject<HTMLDivElement>
  onReady?: (player: YT.Player) => void
  onError?: (error: number) => void
}

export function useYoutubePlayer({ videoId, playerRef, onReady, onError }: UseYoutubePlayerOptions) {
  const [player, setPlayer] = useState<YT.Player | null>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)

  useEffect(() => {
    console.log("[useYoutubePlayer] useEffect triggered. videoId:", videoId)
    
    if (!videoId || !playerRef.current) {
      console.log("[useYoutubePlayer] Skipping: missing videoId or playerRef")
      return
    }
  
    let isMounted = true // 이 줄 추가

    const loadYoutubeIframeAPI = () => {
      console.log("[useYoutubePlayer] Attempting to load YouTube IFrame API.") // 추가
      if (!window.YT) {
        const tag = document.createElement("script")
        tag.src = "https://www.youtube.com/iframe_api"
        const firstScriptTag = document.getElementsByTagName("script")[0]
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
        console.log("[useYoutubePlayer] YouTube IFrame API script tag appended.") // 추가
      } else {
        console.log("[useYoutubePlayer] YouTube IFrame API already loaded (window.YT exists).") // 추가
      }
    }

    const onYouTubeIframeAPIReady = () => {
      console.log("[useYoutubePlayer] onYouTubeIframeAPIReady callback fired.") // 추가
      if (playerRef.current && window.YT) {
        console.log("[useYoutubePlayer] Creating new YouTube Player instance for videoId:", videoId) // 추가
        const newPlayer = new window.YT.Player(playerRef.current, {
          videoId: videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              setPlayer(event.target)
              setIsPlayerReady(true)
              onReady?.(event.target)
              console.log("[useYoutubePlayer] Player onReady event fired. Player state:", event.target.getPlayerState()) // 추가
            },
            onError: (event) => {
              onError?.(event.data)
              console.error("[useYoutubePlayer] Player onError event fired. Error data:", event.data) // 추가
            },
          },
        })
      } else {
        console.warn(
          "[useYoutubePlayer] Cannot create player: playerRef.current or window.YT is missing in onYouTubeIframeAPIReady.",
        ) // 추가
      }
    }

    loadYoutubeIframeAPI()

    if (window.YT) {
      console.log("[useYoutubePlayer] window.YT already exists, calling onYouTubeIframeAPIReady directly.") // 추가
      onYouTubeIframeAPIReady()
    } else {
      console.log("[useYoutubePlayer] window.YT not yet available, setting window.onYouTubeIframeAPIReady.") // 추가
      window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady
    }

    return () => {
      console.log("[useYoutubePlayer] Cleanup function called.") // 추가
      if (player) {
        console.log("[useYoutubePlayer] Destroying existing player.") // 추가
        player.destroy()
        setPlayer(null)
        setIsPlayerReady(false)
      }
      if (window.onYouTubeIframeAPIReady === onYouTubeIframeAPIReady) {
        // 추가: 현재 설정된 콜백인지 확인
        window.onYouTubeIframeAPIReady = undefined
        console.log("[useYoutubePlayer] Cleared window.onYouTubeIframeAPIReady.") // 추가
      }
    }
  }, [videoId]) // player를 의존성에서 제거

  return { player, isPlayerReady }
}
