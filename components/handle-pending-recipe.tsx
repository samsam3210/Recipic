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
  // 자동 저장 로직 제거 - 사용자가 명시적으로 저장 버튼을 클릭해야만 저장되도록 함
  // localStorage의 보류된 레시피는 프리뷰 페이지에서만 처리되어야 함
  
  return null // 이 컴포넌트는 UI를 렌더링하지 않습니다.
}
