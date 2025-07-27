import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getRecentlyViewedRecipes } from "@/lib/actions/recently-viewed"
import { getOrCreateUserProfile } from "@/lib/actions/user"
import { checkDailyUsage } from "@/lib/actions/usage"
import { CachedDashboard } from "@/components/cached-dashboard"
import { DashboardContent } from "@/components/dashboard-content"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // 병렬로 데이터 조회
  const [userProfile, recentlyViewedResult, usageResult] = await Promise.all([
    getOrCreateUserProfile(user),
    getRecentlyViewedRecipes(),
    checkDailyUsage()
  ])

  const userName = userProfile.nickname
  const recentRecipes = recentlyViewedResult.success ? recentlyViewedResult.recipes || [] : []
  const usageData = usageResult.success ? {
    currentCount: usageResult.currentCount || 0,
    isAdmin: usageResult.isAdmin || false
  } : null

  return (
    <CachedDashboard 
      user={user} 
      initialUserProfile={userProfile}
      initialRecentRecipes={recentRecipes}
      initialUsageData={usageData}
    >
      <DashboardContent user={user} userProfile={userProfile} />
    </CachedDashboard>
  )
}