"use client"

import { useQuery } from "@tanstack/react-query"
import { getOrCreateUserProfile } from "@/lib/actions/user"
import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/lib/db/schema"

interface CachedSettingsProps {
  user: User
  initialUserProfile: Profile
  children: (data: {
    userProfile: Profile
    isLoading: boolean
  }) => React.ReactNode
}

export function CachedSettings({ 
  user, 
  initialUserProfile,
  children 
}: CachedSettingsProps) {
  // 사용자 프로필 쿼리 (긴 캐시 - 설정에서만 수정되므로)
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['user-profile', user.id],
    queryFn: () => getOrCreateUserProfile(user),
    initialData: initialUserProfile,
    staleTime: 30 * 60 * 1000, // 30분
    gcTime: 60 * 60 * 1000, // 1시간
  })

  return (
    <>
      {children({
        userProfile: userProfile || initialUserProfile,
        isLoading
      })}
    </>
  )
}