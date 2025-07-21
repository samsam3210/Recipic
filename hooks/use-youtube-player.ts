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
    console.log("useYoutubePlayer useEffect triggered. videoId:", videoId, "playerRef.current:", playerRef.current)

    if (!videoId || !playerRef.current) {
      console.log("useYoutubePlayer: videoId 또는 playerRef.current가 없습니다. 플레이어 초기화를 건너뜁니다.")
      return
    }

    const loadYoutubeIframeAPI = () => {
      if (!window.YT) {
        console.log("useYoutubePlayer: YouTube IFrame API 스크립트를 로드합니다.")
        const tag = document.createElement("script")
        tag.src = "https://www.youtube.com/iframe_api"
        const firstScriptTag = document.getElementsByTagName("script")[0]
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
      } else {
        console.log("useYoutubePlayer: YouTube IFrame API 스크립트가 이미 로드되었습니다.")
      }
    }

    const onYouTubeIframeAPIReady = () => {
      console.log("useYoutubePlayer: onYouTubeIframeAPIReady가 트리거되었습니다.")
      if (playerRef.current && window.YT) {
        console.log("useYoutubePlayer: 새로운 YT.Player를 videoId:", videoId, "로 초기화합니다.")
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
              console.log("useYoutubePlayer: 플레이어 onReady 이벤트 발생. Target:", event.target)
              setPlayer(event.target)
              setIsPlayerReady(true)
              onReady?.(event.target)
            },
            onError: (event) => {
              console.error("useYoutubePlayer: 플레이어 onError 이벤트 발생. 오류 데이터:", event.data)
              onError?.(event.data)
            },
          },
        })
      } else {
        console.log(
          "useYoutubePlayer: onYouTubeIframeAPIReady에서 playerRef.current 또는 window.YT를 사용할 수 없습니다.",
        )
      }
    }

    loadYoutubeIframeAPI()

    if (window.YT) {
      console.log("useYoutubePlayer: YT 객체가 이미 존재하여 onYouTubeIframeAPIReady를 직접 호출합니다.")
      onYouTubeIframeAPIReady()
    } else {
      console.log("useYoutubePlayer: YT 객체를 아직 사용할 수 없어 window.onYouTubeIframeAPIReady를 설정합니다.")
      window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady
    }

    return () => {
      console.log("useYoutubePlayer: 클린업 함수가 트리거되었습니다.")
      if (player) {
        console.log("useYoutubePlayer: 플레이어를 파괴합니다.")
        player.destroy()
        setPlayer(null)
        setIsPlayerReady(false)
      }
      window.onYouTubeIframeAPIReady = undefined
    }
  }, [videoId, playerRef, onReady, onError, player])

  return { player, isPlayerReady }
}
