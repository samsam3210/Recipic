"use client"

import { Header } from "@/components/header"
import { HandlePendingRecipe } from "@/components/handle-pending-recipe"
import { HeroSection } from "@/components/hero-section"
import { DashboardRecentRecipesServer } from "@/components/dashboard-recent-recipes-server"
import { BottomNavigation } from "@/components/bottom-navigation"
import { SidebarNav } from "@/components/sidebar-nav"
import { dashboardSidebarNavItems } from "@/lib/navigation"
import { useDashboardCache } from "@/components/cached-dashboard"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardContent({ user }: { user: any }) {
  const { userProfile: cachedUserProfile, recentRecipes: cachedRecentRecipes, usageData, isLoading } = useDashboardCache()
  const userName = cachedUserProfile?.nickname
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 - 네비게이션 메뉴 없음 */}
      <Header />
      
      <main className="flex-1 pt-6 md:pt-8 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 pb-20 lg:pb-8">
        <HandlePendingRecipe user={user} />

        {/* 왼쪽 사이드바 (데스크톱만) */}
        <aside className="hidden lg:block lg:w-1/5 lg:min-w-[200px] lg:border-r lg:pr-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">메뉴</h2>
          <SidebarNav items={dashboardSidebarNavItems} />
        </aside>

        <section className="flex-1 lg:w-4/5 space-y-6">
          {/* 인사말과 캐치프레이즈 문구 */}
          <div className="space-y-0">
            {isLoading ? (
              <>
                <Skeleton className="h-10 w-80 mb-2" />
                <Skeleton className="h-10 w-96" />
              </>
            ) : (
              <>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 my-0">안녕하세요, {userName}님! 👋</h1>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800 my-0">어떤 레시피를 알려드릴까요?</h2>
              </>
            )}
          </div>

          <HeroSection user={user} isDashboard={true} cachedUsageData={usageData} isLoading={isLoading} />

          <DashboardRecentRecipesServer recipes={cachedRecentRecipes} isLoading={isLoading} />
          </section>
          </div>
        </div>
      </main>
      
      {/* 하단 네비게이션 (모바일만) */}
      <BottomNavigation />
      
      <footer className="hidden lg:block border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>
    </div>
  )
}