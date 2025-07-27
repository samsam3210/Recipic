"use client"

import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getRecentlyViewedRecipes } from "@/lib/actions/recently-viewed"
import { getOrCreateUserProfile } from "@/lib/actions/user"
import type { User } from "@supabase/supabase-js"

interface CachedDashboardProps {
  user: User
  initialUserProfile: any
  initialRecentRecipes: any[]
  children: (data: {
    userProfile: any
    recentRecipes: any[]
    isLoading: boolean
  }) => React.ReactNode
}

export function CachedDashboard({ 
  user, 
  initialUserProfile, 
  initialRecentRecipes, 
  children 
}: CachedDashboardProps) {
  // 사용자 프로필 쿼리 (긴 캐시)
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user.id],
    queryFn: () => getOrCreateUserProfile(user),
    initialData: initialUserProfile,
    staleTime: 30 * 60 * 1000, // 30분
    gcTime: 60 * 60 * 1000, // 1시간
  })

  // 최근 본 레시피 쿼리 (짧은 캐시)
  const { data: recentlyViewedResult, isLoading } = useQuery({
    queryKey: ['recently-viewed-recipes', user.id],
    queryFn: () => getRecentlyViewedRecipes(),
    initialData: { success: true, recipes: initialRecentRecipes },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })

  const recentRecipes = recentlyViewedResult?.success ? recentlyViewedResult.recipes || [] : []

  return (
    <>
      {children({
        userProfile,
        recentRecipes,
        isLoading
      })}
    </>
  )
}