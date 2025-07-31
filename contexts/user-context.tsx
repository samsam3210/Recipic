"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { getOrCreateUserProfile } from "@/lib/actions/user"
import { useCacheInvalidation } from "@/hooks/use-cache-invalidation"
import { useSessionMonitor } from "@/hooks/use-session-monitor"
import type { User } from "@supabase/supabase-js"
import type { UserProfile } from "@/lib/actions/user"

interface UserContextType {
  user: User | null
  userProfile: UserProfile | null
  isLoading: boolean
  authError: boolean
  updateUserProfile: (updatedProfile: Partial<UserProfile>) => void
}

const UserContext = createContext<UserContextType>({
  user: null,
  userProfile: null,
  isLoading: true,
  authError: false,
  updateUserProfile: () => {}
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState(false)
  const { invalidateAll } = useCacheInvalidation()
  
  // 세션 모니터링 활성화
  useSessionMonitor()

  useEffect(() => {
    const supabase = createClient()

    // 초기 사용자 로드
    const loadUser = async () => {
      // 5초 타임아웃 설정
      const timeoutId = setTimeout(() => {
        console.log("User authentication timeout - 5 seconds elapsed")
        setIsLoading(false)
        setAuthError(true)
      }, 5000)

      try {
        console.log("Loading initial session...")
        const { data: { session }, error } = await supabase.auth.getSession()
        clearTimeout(timeoutId) // 정상 로드 시 타임아웃 취소
        
        if (error) {
          console.error("Session error:", error)
          setUser(null)
          setIsLoading(false)
          return
        }
        
        const user = session?.user ?? null
        console.log("Session loaded:", { 
          hasUser: !!user, 
          hasSession: !!session,
          expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : null
        })
        setUser(user)
        
        if (user) {
          try {
            const profile = await getOrCreateUserProfile(user)
            setUserProfile(profile)
          } catch (error) {
            console.error("Failed to load user profile:", error)
          }
        }
        
        setIsLoading(false)
      } catch (error) {
        clearTimeout(timeoutId)
        console.error("Error loading user:", error)
        setIsLoading(false)
        setAuthError(true)
      }
    }

    loadUser()

    // 토큰 자동 리프레시 체크 (30분마다)
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (session && !error) {
          const now = Math.floor(Date.now() / 1000)
          const expiresAt = session.expires_at || 0
          const timeToExpiry = expiresAt - now
          
          // 5분 전에 리프레시 시도
          if (timeToExpiry < 300) { // 300초 = 5분
            console.log("Token expires soon, attempting refresh...")
            const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession()
            
            if (refreshError) {
              console.error("Token refresh failed:", refreshError)
            } else if (refreshedSession.session) {
              console.log("Token refreshed successfully:", {
                expiresAt: new Date(refreshedSession.session.expires_at! * 1000).toLocaleString()
              })
            }
          }
        }
      } catch (error) {
        console.error("Error during token refresh check:", error)
      }
    }, 30 * 60 * 1000) // 30분마다 체크

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", { 
          event, 
          hasSession: !!session, 
          hasUser: !!session?.user,
          expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : null
        })
        
        const newUser = session?.user ?? null
        setUser(newUser)
        
        if (newUser) {
          try {
            const profile = await getOrCreateUserProfile(newUser)
            setUserProfile(profile)
          } catch (error) {
            console.error("Failed to load user profile:", error)
            setUserProfile(null)
          }
        } else {
          setUserProfile(null)
          // 로그아웃 시 모든 캐시 삭제
          invalidateAll()
          clearInterval(refreshInterval) // 리프레시 인터벌 정리
        }
        
        setIsLoading(false)
        setAuthError(false) // 로그아웃/로그인 시 에러 상태 초기화
      }
    )

    return () => {
      subscription.unsubscribe()
      clearInterval(refreshInterval)
    }
  }, [])

  const updateUserProfile = (updatedProfile: Partial<UserProfile>) => {
    setUserProfile(prev => prev ? { ...prev, ...updatedProfile } : null)
  }

  return (
    <UserContext.Provider value={{ user, userProfile, isLoading, authError, updateUserProfile }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}