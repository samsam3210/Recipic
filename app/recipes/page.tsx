import { redirect } from "next/navigation"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/actions/user"
import { fetchRecipesAndFolders, getPaginatedRecipes } from "@/lib/actions/recipe-fetch"
import type { folders as foldersSchema } from "@/lib/db/schema"
import type { Profile } from "@/lib/db/schema"
import { CachedRecipes } from "@/components/cached-recipes"
import { RecipesContent } from "@/components/recipes-content"

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
  let initialRecipesData: any = null

  try {
    const profileResult = await getUserProfile(userId)
    userProfile = profileResult.profile

    const foldersResult = await fetchRecipesAndFolders(userId, null)
    initialFolders = foldersResult.folders
    if (foldersResult.error) {
      console.error("Error fetching folders for RecipesPage:", foldersResult.error)
    }

    // 초기 레시피 데이터 가져오기 - 클라이언트와 동일한 매개변수 사용
    if (page === 1) { // 첫 페이지만 서버에서 로드
      const initialRecipes = await getPaginatedRecipes({
        userId,
        page,
        limit,
        folderId: selectedFolderId,
      })
      initialRecipesData = initialRecipes
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
    <CachedRecipes 
      user={user}
      selectedFolderId={selectedFolderId}
      initialFolders={initialFolders}
      initialUserProfile={userProfile}
    >
      <RecipesContent 
        userId={userId}
        selectedFolderId={selectedFolderId}
        page={page}
        limit={limit}
        initialRecipesData={initialRecipesData}
      />
    </CachedRecipes>
  )
}