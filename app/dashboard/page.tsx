import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Header } from "@/components/header"
import { HandlePendingRecipe } from "@/components/handle-pending-recipe"
import { HeroSection } from "@/components/hero-section"
import { DashboardRecentRecipesServer } from "@/components/dashboard-recent-recipes-server"
import { fetchRecentRecipes } from "@/lib/actions/recipe-fetch"
import { getOrCreateUserProfile } from "@/lib/actions/user"
import { SidebarNav } from "@/components/sidebar-nav"

const dashboardSidebarNavItems = [
  {
    title: "Home", // 변경
    href: "/dashboard",
  },
  {
    title: "My Recipes", // 변경
    href: "/recipes",
  },
  {
    title: "My Page", // 변경
    href: "/settings",
  },
]

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // 병렬로 사용자 프로필과 최근 레시피 조회
  const [userProfile, recentRecipesResult] = await Promise.all([
    getOrCreateUserProfile(user),
    fetchRecentRecipes(user.id, 3)
  ])

  const userName = userProfile.nickname
  const recentRecipes = recentRecipesResult.recipes

  return (
    <div className="flex flex-col min-h-screen">
      <Header user={user} userProfile={userProfile} />
      <main className="flex-1 flex flex-col lg:flex-row py-8 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full gap-8">
        <HandlePendingRecipe user={user} />

        <aside className="lg:w-1/5 lg:min-w-[200px] lg:border-r lg:pr-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 hidden lg:block">메뉴</h2>
          <SidebarNav items={dashboardSidebarNavItems} /> {/* 이 부분을 다시 추가합니다. */}
        </aside>

            <section className="flex-1 lg:w-4/5 space-y-6"> {/* 이 부모 요소의 space-y-10은 그대로 유지 */}
              {/* 인사말과 캐치프레이즈 문구 배치 조정 */}
              {/* 이 새로운 div가 두 h태그 사이의 간격을 제어합니다. */}
              <div className="space-y-0">
                {/* 폰트 사이즈를 동일하게 변경하고, 기본 마진을 제거합니다. */}
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 my-0">안녕하세요, {userName}님! 👋</h1>
                {/* h2의 폰트 사이즈를 h1과 동일하게 맞추고, 불필요한 마진을 제거합니다. */}
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800 my-0">어떤 요리를 해볼까요?</h2>
              </div>

              <HeroSection user={user} isDashboard={true} />

              <DashboardRecentRecipesServer recipes={recentRecipes} />
            </section>
      </main>
      <footer className="border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>
    </div>
  )
}
