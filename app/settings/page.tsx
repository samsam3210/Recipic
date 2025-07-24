import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { BottomNavigation } from "@/components/bottom-navigation"
import { redirect } from "next/navigation"
import { ProfileSettingsForm } from "@/components/profile-settings-form"
import { getOrCreateUserProfile } from "@/lib/actions/user"
import { settingsSidebarNavItems, settingsSubNavItems } from "@/lib/navigation"
import { Suspense } from "react"

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const userProfile = await getOrCreateUserProfile(user)

  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 - 네비게이션 메뉴 없음 */}
      <Header />
      
      <main className="flex-1 flex flex-col lg:flex-row py-8 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full gap-8 pb-20 lg:pb-8">
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
        <ProfileSettingsForm user={user} userProfile={userProfile} />
          </Suspense>
        </section>
      </main>
      
      {/* 하단 네비게이션 (모바일만) */}
      <BottomNavigation />
      
      <footer className="hidden lg:block border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>
    </div>
  )
}