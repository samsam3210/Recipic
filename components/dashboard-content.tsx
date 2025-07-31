"use client"

import { Header } from "@/components/header"
import { HandlePendingRecipe } from "@/components/handle-pending-recipe"
import Image from "next/image"
import { HeroSection } from "@/components/hero-section"
import { DashboardRecentRecipesServer } from "@/components/dashboard-recent-recipes-server"
import { BottomNavigation } from "@/components/bottom-navigation"
import { SidebarNav } from "@/components/sidebar-nav"
import { dashboardSidebarNavItems } from "@/lib/navigation"
import { useDashboardCache } from "@/components/cached-dashboard"
import { useUser } from "@/contexts/user-context"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardContent({ user }: { user: any }) {
  const { userProfile: cachedUserProfile, recentRecipes: cachedRecentRecipes, usageData, isLoading } = useDashboardCache()
  const { userProfile: contextUserProfile } = useUser()
  
  // UserContext의 프로필을 우선 사용, fallback으로 캐시된 프로필 사용
  const activeUserProfile = contextUserProfile || cachedUserProfile
  const userName = activeUserProfile?.nickname || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "사용자"
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 - 네비게이션 메뉴 없음 */}
      <Header />
      
      <main className="flex-1 pt-6 md:pt-8 w-full py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 pb-20 lg:pb-8">
        <HandlePendingRecipe user={user} />

        {/* 왼쪽 사이드바 (데스크톱만) */}
        <aside className="hidden lg:block lg:w-1/5 lg:min-w-[200px] lg:border-r lg:pr-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">메뉴</h2>
          <SidebarNav items={dashboardSidebarNavItems} />
        </aside>

        <section className="flex-1 lg:w-4/5 space-y-6">
          {/* 모바일 전용 로고 */}
          <div className="lg:hidden px-6">
            <Image
              src="/recipick-logo.png"
              alt="Recipick"
              width={180}
              height={45}
              className="h-11 w-auto mb-6"
            />
          </div>
          
          {/* 인사말과 캐치프레이즈 문구 */}
          <div className="space-y-0 px-6">
            {isLoading ? (
              <>
                <Skeleton className="h-10 w-80 mb-2" />
                <Skeleton className="h-10 w-96" />
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-gray-900 my-0">{userName}님,<br />어떤 요리를 해볼까요?</h1>
              </>
            )}
          </div>

          <div className="px-6">
            <HeroSection user={user} isDashboard={true} cachedUsageData={usageData} isLoading={isLoading} />
          </div>

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