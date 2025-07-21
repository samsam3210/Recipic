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
    if (!videoId || !playerRef.current) return

    const loadYoutubeIframeAPI = () => {
      if (!window.YT) {
        const tag = document.createElement("script")
        tag.src = "https://www.youtube.com/iframe_api"
        const firstScriptTag = document.getElementsByTagName("script")[0]
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
      }
    }

    const onYouTubeIframeAPIReady = () => {
      if (playerRef.current && window.YT) {
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
            },
            onError: (event) => {
              onError?.(event.data)
            },
          },
        })
      }
    }

    loadYoutubeIframeAPI()

    if (window.YT) {
      onYouTubeIframeAPIReady()
    } else {
      window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady
    }

    return () => {
      if (player) {
        player.destroy()
        setPlayer(null)
        setIsPlayerReady(false)
      }
      window.onYouTubeIframeAPIReady = undefined
    }
  }, [videoId, playerRef, onReady, onError])

  return { player, isPlayerReady }
}
