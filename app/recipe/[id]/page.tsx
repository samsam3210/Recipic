import { notFound } from "next/navigation"
import { RecipeDetailClient } from "@/components/recipe-detail-client"
import { getRecipeById } from "@/lib/actions/recipe-fetch"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getUserDailyUsage, incrementDailyUsage } from "@/lib/actions/usage"

export default async function RecipeDetailPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // 로그인하지 않은 사용자는 레시피 상세 페이지에 접근할 수 없도록 리다이렉트 또는 오류 처리
    // 여기서는 간단히 notFound()를 사용하지만, 실제 앱에서는 로그인 페이지로 리다이렉트하는 것이 좋습니다.
    notFound()
  }

  const recipe = await getRecipeById(params.id)

  if (!recipe) {
    notFound()
  }

  // 사용량 제한 확인 및 증가 (관리자 제외)
  const { isAdmin } = await getUserDailyUsage(user.id)
  if (!isAdmin) {
    const { canView, message } = await incrementDailyUsage(user.id)
    if (!canView) {
      // 사용량 초과 시 오류 페이지 또는 메시지 표시
      // 여기서는 간단히 notFound()를 사용하지만, 실제 앱에서는 사용자에게 알리는 페이지로 리다이렉트하는 것이 좋습니다.
      console.warn(`User ${user.id} exceeded daily usage limit: ${message}`)
      notFound() // 또는 사용량 초과 페이지로 리다이렉트
    }
  }

  let videoId: string | null = null
  if (recipe?.youtubeUrl) {
    const youtubeUrl = recipe.youtubeUrl
    // YouTube Shorts URL을 포함하도록 정규 표현식 업데이트
    const videoIdMatch = youtubeUrl.match(
      /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|shorts\/|)([a-zA-Z0-9_-]{11})(?:\S+)?/,
    )
    if (videoIdMatch && videoIdMatch[1]) {
      videoId = videoIdMatch[1]
    }
  }

  console.log("app/recipe/[id]/page.tsx: Extracted videoId:", videoId) // 디버깅 로그 추가

  return <RecipeDetailClient recipe={recipe} videoId={videoId} />
}
