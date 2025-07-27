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
}

const UserContext = createContext<UserContextType>({
  user: null,
  userProfile: null,
  isLoading: true
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { invalidateAll } = useCacheInvalidation()

  useEffect(() => {
    const supabase = createClient()

    // 초기 사용자 로드
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
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
    }

    loadUser()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <UserContext.Provider value={{ user, userProfile, isLoading }}>
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