import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { redirect } from "next/navigation"
import { ProfileSettingsForm } from "@/components/profile-settings-form"
import { getOrCreateUserProfile } from "@/lib/actions/user"

const sidebarNavItems = [
  {
    title: "프로필",
    href: "/settings",
  },
]

const headerNavItems = [
  {
    title: "Home",
    href: "/dashboard",
  },
  {
    title: "My Recipes",
    href: "/recipes",
  },
  {
    title: "My Page",
    href: "/settings",
  },
]

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
      <Header user={user} userProfile={userProfile} navItems={headerNavItems} /> {/* 상단 내비게이션 노출 */}
      <main className="flex-1 flex flex-col lg:flex-row py-8 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full gap-8">
        <aside className="lg:w-1/5 lg:min-w-[200px] lg:border-r lg:pr-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 hidden lg:block">설정</h2>
          <SidebarNav items={sidebarNavItems} />
        </aside>

        <section className="flex-1 lg:w-4/5 space-y-10">
          {/* 상단 타이틀 '마이페이지' 제거 */}
          <ProfileSettingsForm user={user} userProfile={userProfile} />
        </section>
      </main>
      <footer className="border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>
    </div>
  )
}
