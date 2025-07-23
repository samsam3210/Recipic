import { redirect } from "next/navigation"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/actions/user"
import { fetchRecipesAndFolders } from "@/lib/actions/recipe-fetch"
import { Suspense } from "react"
import type { folders as foldersSchema } from "@/lib/db/schema"
import type { Profile } from "@/lib/db/schema"
import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { BottomNavigation } from "@/components/bottom-navigation"
import { FolderListSkeleton } from "@/components/folder-list-skeleton"
import { RecipeCardSkeleton } from "@/components/recipe-card-skeleton"
import { FolderList } from "@/components/folder-list"
import RecipeGridWrapper from "@/components/recipe-grid-wrapper"
import { CurrentFolderTitle } from "@/components/current-folder-title"
import { myRecipesSidebarNavItems } from "@/lib/navigation"
import { MobileFolderSelector } from "@/components/mobile-folder-selector"

export const dynamic = "force-dynamic"

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabaseClient = createServerClient()
  const {
    data: { user },
  } = await supabaseClient.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const userId = user.id
  const selectedFolderId = typeof searchParams.folder === "string" ? searchParams.folder : null
  const page = typeof searchParams.page === "string" ? Number.parseInt(searchParams.page) : 1
  const limit = 6

  let initialFolders: (typeof foldersSchema.$inferSelect)[] = []
  let userProfile: Profile | null = null

  try {
    const profileResult = await getUserProfile(userId)
    userProfile = profileResult.profile

    const foldersResult = await fetchRecipesAndFolders(userId, null)
    initialFolders = foldersResult.folders
    if (foldersResult.error) {
      console.error("Error fetching folders for RecipesPage:", foldersResult.error)
    }
  } catch (err: any) {
    console.error("Failed to load initial data for RecipesPage:", err)
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <h1 className="text-2xl font-bold text-red-600">데이터 로딩 오류</h1>
        <p className="text-gray-600">레시피를 불러오는 데 실패했습니다: {err.message}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 - 네비게이션 메뉴 없음 */}
      <Header user={user} userProfile={userProfile} />
      
      <main className="flex-1 flex flex-col lg:flex-row py-8 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full gap-8 pb-20 lg:pb-8">
        {/* 왼쪽 사이드바 (데스크톱만) */}
        <aside className="hidden lg:block lg:w-1/5 lg:min-w-[200px] lg:border-r lg:pr-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">메뉴</h2>
          <SidebarNav items={myRecipesSidebarNavItems} className="mb-8" />
          <Suspense fallback={<FolderListSkeleton />}>
            <FolderList folders={initialFolders} selectedFolderId={selectedFolderId} />
          </Suspense>
        </aside>

        <section className="flex-1 lg:w-4/5 space-y-10">
          <MobileFolderSelector folders={initialFolders} selectedFolderId={selectedFolderId} />
          
          <CurrentFolderTitle folders={initialFolders} />

          <Suspense
            fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <RecipeCardSkeleton key={i} />
                ))}
              </div>
            }
          >
            <RecipeGridWrapper
              userId={userId}
              initialSelectedFolderId={selectedFolderId}
              initialPage={page}
              initialLimit={limit}
              initialFolders={initialFolders}
            />
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