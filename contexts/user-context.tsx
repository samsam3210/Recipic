"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { getOrCreateUserProfile } from "@/lib/actions/user"
import { useCacheInvalidation } from "@/hooks/use-cache-invalidation"
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
        console.log("Session loaded:", { hasUser: !!user, hasSession: !!session })
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

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", { event, hasSession: !!session, hasUser: !!session?.user })
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
        }
        
        setIsLoading(false)
        setAuthError(false) // 로그아웃/로그인 시 에러 상태 초기화
      }
    )

    return () => subscription.unsubscribe()
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