"use client"

import { Suspense } from "react"
import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { BottomNavigation } from "@/components/bottom-navigation"
import { ProfileSettingsForm } from "@/components/profile-settings-form"
import { settingsSidebarNavItems, settingsSubNavItems } from "@/lib/navigation"
import { useSettingsCache } from "@/components/cached-settings"

export function SettingsContent({ user }: { user: any }) {
  const { userProfile: cachedUserProfile, isLoading } = useSettingsCache()
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
      <Header user={user} userProfile={cachedUserProfile} />
      
      <main className="flex-1 pt-6 md:pt-8 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 pb-20 lg:pb-8">
        {/* 왼쪽 사이드바 (데스크톱만) */}
        <aside className="hidden lg:block lg:w-1/5 lg:min-w-[200px] lg:border-r lg:pr-8">
          {/* 메인 네비게이션 */}
          <h2 className="text-2xl font-bold text-gray-900 mb-6">메뉴</h2>
          <SidebarNav items={settingsSidebarNavItems} className="mb-8" />
          
          {/* 설정 하위 메뉴 */}
          <h3 className="text-lg font-semibold text-gray-900 mb-4">설정</h3>
          <SidebarNav items={settingsSubNavItems} />
        </aside>

        <section className="flex-1 lg:w-4/5 space-y-10">
          <Suspense fallback={<div>로딩 중...</div>}>
            <ProfileSettingsForm user={user} userProfile={cachedUserProfile} />
          </Suspense>
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