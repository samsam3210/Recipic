"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

/**
 * 세션 만료 모니터링 및 자동 갱신 훅
 */
export function useSessionMonitor() {
  const { toast } = useToast()

  useEffect(() => {
    const supabase = createClient()
    let isRefreshing = false

    // API 요청 인터셉터 (401 에러 시 자동 리프레시)
    const interceptor = async (response: Response) => {
      if (response.status === 401 && !isRefreshing) {
        isRefreshing = true
        
        try {
          console.log("401 detected, attempting session refresh...")
          const { data, error } = await supabase.auth.refreshSession()
          
          if (error) {
            console.error("Session refresh failed:", error)
            toast({
              title: "세션 만료",
              description: "다시 로그인해주세요.",
              variant: "destructive",
            })
            // 로그인 페이지로 리다이렉트
            window.location.href = "/"
          } else if (data.session) {
            console.log("Session refreshed successfully")
            toast({
              title: "세션 갱신",
              description: "자동으로 세션이 갱신되었습니다.",
            })
            // 페이지 새로고침으로 최신 토큰 반영
            window.location.reload()
          }
        } catch (error) {
          console.error("Unexpected error during session refresh:", error)
        } finally {
          isRefreshing = false
        }
      }
      
      return response
    }

    // 전역 fetch 래핑 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      const originalFetch = window.fetch
      window.fetch = async (...args) => {
        const response = await originalFetch(...args)
        return interceptor(response)
      }

      return () => {
        window.fetch = originalFetch
      }
    }
  }, [toast])

  // 세션 상태 모니터링 함수 반환
  return {
    checkSessionStatus: async () => {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error("Session check error:", error)
        return { isValid: false, error: error.message }
      }
      
      if (!session) {
        return { isValid: false, error: "No session found" }
      }
      
      const now = Math.floor(Date.now() / 1000)
      const expiresAt = session.expires_at || 0
      const timeToExpiry = expiresAt - now
      
      return {
        isValid: true,
        expiresAt: new Date(expiresAt * 1000),
        timeToExpiry,
        willExpireSoon: timeToExpiry < 300, // 5분 미만
      }
    }
  }
}