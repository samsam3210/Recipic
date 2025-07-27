import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getRecentlyViewedRecipes } from "@/lib/actions/recently-viewed"
import { getOrCreateUserProfile } from "@/lib/actions/user"
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

  // 병렬로 사용자 프로필과 최근 본 레시피 조회
  const [userProfile, recentlyViewedResult] = await Promise.all([
    getOrCreateUserProfile(user),
    getRecentlyViewedRecipes()
  ])

  const userName = userProfile.nickname
  const recentRecipes = recentlyViewedResult.success ? recentlyViewedResult.recipes || [] : []

  return (
    <CachedDashboard 
      user={user} 
      initialUserProfile={userProfile}
      initialRecentRecipes={recentRecipes}
    >
      <DashboardContent user={user} userProfile={userProfile} />
    </CachedDashboard>
  )
}