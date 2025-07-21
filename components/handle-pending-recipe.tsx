"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { checkAndSaveRecipe } from "@/lib/actions/recipe" // 수정된 서버 액션 임포트
import type { User } from "@supabase/supabase-js"

interface RecipeData {
  id?: string
  recipeName: string | null
  noRecipeFoundMessage: string | null
  summary: string
  difficulty: string
  cookingTimeMinutes: number
  ingredients: Array<{ name: string; quantity: number | string; unit: string; notes: string }>
  steps: Array<{
    stepNumber: number
    description: string
    notes: string
    ingredientsUsed: string[]
    youtubeTimestampSecond: number
  }>
  tips: Array<{ title: string; description: string }>
  personalNotes: string | null
}

interface VideoInfo {
  videoId: string
  videoTitle: string
  videoThumbnail: string
  channelName: string
  videoDurationSeconds: number
  videoViews: number
  transcriptText: string
  hasSubtitles: boolean
}

interface PendingRecipeData {
  youtubeUrl: string
  videoInfo: VideoInfo
  extractedRecipe: RecipeData
}

const PENDING_RECIPE_STORAGE_KEY = "recipick_pending_recipe"

interface HandlePendingRecipeProps {
  user: User | null
}

export function HandlePendingRecipe({ user }: HandlePendingRecipeProps) {
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // 사용자가 로그인되어 있고, localStorage에 보류 중인 레시피가 있을 때만 저장 로직 실행
    if (user) {
      const storedData = localStorage.getItem(PENDING_RECIPE_STORAGE_KEY)
      if (storedData) {
        console.log("[HandlePendingRecipe] Pending recipe found in localStorage. Attempting to save...")
        try {
          const pendingRecipe: PendingRecipeData = JSON.parse(storedData)
          localStorage.removeItem(PENDING_RECIPE_STORAGE_KEY) // 중복 처리 방지를 위해 즉시 제거

          const saveRecipe = async () => {
            toast({
              title: "레시피 저장 중...",
              description: "로그인 후 레시피를 저장하고 있습니다.",
              duration: 3000,
            })

            // processAndSaveRecipeForLoggedInUser를 호출하여 중복 확인 및 저장 처리
            // 보류 중인 레시피는 이미 추출된 것이므로, 여기서는 강제 재추출 옵션을 false로 둡니다.
            // 만약 중복이라면 기존 레시피로 리디렉션하는 것이 UX상 더 자연스럽습니다.
            const result = await checkAndSaveRecipe(
              pendingRecipe.youtubeUrl,
              pendingRecipe.videoInfo,
              pendingRecipe.extractedRecipe,
              false,
            )

            if (result.success) {
              if (result.isDuplicate && result.recipeId) {
                // 중복 레시피 발견 시 기존 레시피로 리디렉션
                toast({
                  title: "알림",
                  description: "이미 저장된 레시피입니다. 기존 레시피로 이동합니다.",
                  variant: "info",
                })
                router.replace(`/recipe/${result.recipeId}`)
              } else if (result.recipeId) {
                // 새 레시피 저장 성공
                toast({
                  title: "저장 완료",
                  description: result.message,
                })
                router.replace(`/recipe/${result.recipeId}`) // 저장된 레시피 상세 페이지로 이동
              } else {
                // 성공했지만 recipeId가 없는 경우 (예외 상황)
                throw new Error(result.message || "레시피 처리 후 ID를 찾을 수 없습니다.")
              }
            } else {
              throw new Error(result.message || "레시피 저장에 실패했습니다.")
            }
          }
          saveRecipe().catch((error: any) => {
            console.error("[HandlePendingRecipe] Failed to save pending recipe:", error)
            toast({
              title: "저장 실패",
              description: error.message || "로그인 후 레시피 저장 중 오류가 발생했습니다.",
              variant: "destructive",
            })
            router.replace("/dashboard") // 오류 발생 시 대시보드로 리디렉션
          })
        } catch (error) {
          console.error("[HandlePendingRecipe] Failed to parse stored pending recipe:", error)
          toast({
            title: "오류",
            description: "임시 저장된 레시피 데이터를 불러오는 데 실패했습니다.",
            variant: "destructive",
          })
          localStorage.removeItem(PENDING_RECIPE_STORAGE_KEY) // 유효하지 않은 데이터 제거
          router.replace("/dashboard") // 오류 발생 시 대시보드로 리디렉션
        }
      }
    }
  }, [user, router, toast]) // user 상태가 변경될 때마다 useEffect 실행

  return null // 이 컴포넌트는 UI를 렌더링하지 않습니다.
}
