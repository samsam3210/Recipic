import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { redirect } from "next/navigation"
import { ProfileSettingsForm } from "@/components/profile-settings-form"
import { getOrCreateUserProfile } from "@/lib/actions/user"
import { mainNavItems, settingsSidebarNavItems } from "@/lib/navigation"

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
      {/* 상단 헤더에 통일된 네비게이션 적용 */}
      <Header user={user} userProfile={userProfile} navItems={mainNavItems} />
      
      <main className="flex-1 flex flex-col lg:flex-row py-8 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full gap-8">
        {/* 왼쪽 사이드바 추가 (다른 페이지와 동일한 구조) */}
        <aside className="lg:w-1/5 lg:min-w-[200px] lg:border-r lg:pr-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 hidden lg:block">설정</h2>
          <SidebarNav items={settingsSidebarNavItems} />
        </aside>

        <section className="flex-1 lg:w-4/5 space-y-10">
          <ProfileSettingsForm user={user} userProfile={userProfile} />
        </section>
      </main>
      
      <footer className="border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>
    </div>
  )
}