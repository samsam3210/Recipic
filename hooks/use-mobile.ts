"use client"

import { useState, useEffect } from "react"

// useMediaQuery 훅 정의
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      // SSR 환경에서는 항상 false 반환
      return
    }

    const mediaQueryList = window.matchMedia(query)
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // 초기 값 설정
    setMatches(mediaQueryList.matches)

    // 이벤트 리스너 등록
    mediaQueryList.addEventListener("change", listener)

    // 클린업 함수
    return () => {
      mediaQueryList.removeEventListener("change", listener)
    }
  }, [query])

  return matches
}
