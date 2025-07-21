import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import { RecipeDetailClient } from "@/components/recipe-detail-client"
import { getOrCreateUserProfile } from "@/lib/actions/user"

export default async function RecipeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const recipeId = params.id

  if (!recipeId) {
    notFound()
  }

  const [recipeData] = await db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1)

  if (!recipeData || recipeData.userId !== user?.id) {
    // 레시피가 없거나, 현재 로그인한 사용자의 레시피가 아닌 경우
    notFound()
  }

  // JSONB 필드 타입 변환 (Drizzle ORM이 자동으로 처리하지 않을 경우)
  const parsedRecipe = {
    ...recipeData,
    ingredients: recipeData.ingredients as any, // 실제 타입에 맞게 캐스팅
    steps: recipeData.steps as any,
    tips: recipeData.tips as any,
  }

  // MODIFIED: YouTube URL에서 videoId를 추출하는 대신, DB에서 직접 가져옵니다.
  const videoId = parsedRecipe.video_id || null

  console.log("[RecipeDetailPage] Original YouTube URL:", parsedRecipe.youtubeUrl)
  console.log("[RecipeDetailPage] Extracted Video ID from DB:", videoId) // 로그 메시지 수정
  // console.log("[RecipeDetailPage] Video ID Match Result:", videoIdMatch) // REMOVED: 더 이상 필요 없음

  console.log("[RecipeDetailPage] Parsed Recipe Data:", parsedRecipe)
  // console.log("[RecipeDetailPage] Extracted Video ID:", videoId) // 중복 로그 제거

  const userProfile = await getOrCreateUserProfile(user?.id)

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <RecipeDetailClient recipe={parsedRecipe} videoId={videoId} />
      </main>
      <footer className="border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>
    </div>
  )
}
