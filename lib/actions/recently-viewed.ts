"use server"

import { db } from "@/lib/db"
import { recentlyViewedRecipes } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { createClient } from "@/lib/supabase/server"

interface RecentlyViewedRecipe {
  id: string
  recipeName: string
  youtubeUrl: string
  videoThumbnail?: string
  channelName?: string
  channelId?: string
  channelUrl?: string
  channelThumbnail?: string
  summary?: string
  viewedAt: Date
  difficulty?: string
  cookingTimeMinutes?: number
  ingredients?: Array<{ name: string; quantity: number | string; unit: string; notes: string }>
  steps?: Array<{
    stepNumber: number
    description: string
    notes: string
    ingredientsUsed: string[]
    youtubeTimestampSecond: number
  }>
  tips?: Array<{ title: string; description: string }>
  videoDescription?: string
  noRecipeFoundMessage?: string
  videoDurationSeconds?: number
  videoViews?: number
  personalNotes?: string
  savedRecipeId?: string | null
}

interface AddRecentlyViewedParams {
  recipeName: string
  videoTitle?: string // 실제 YouTube 비디오 제목 (중복 체크용)
  youtubeUrl: string
  videoThumbnail?: string
  channelName?: string
  channelId?: string
  channelUrl?: string
  channelThumbnail?: string
  summary?: string
  difficulty?: string
  cookingTimeMinutes?: number
  ingredients?: Array<{ name: string; quantity: number | string; unit: string; notes: string }>
  steps?: Array<{
    stepNumber: number
    description: string
    notes: string
    ingredientsUsed: string[]
    youtubeTimestampSecond: number
  }>
  tips?: Array<{ title: string; description: string }>
  videoDescription?: string
  noRecipeFoundMessage?: string
  videoDurationSeconds?: number
  videoViews?: number
  savedRecipeId?: string | null
}

const MAX_RECENTLY_VIEWED = 10

/**
 * 최근 본 레시피 목록 조회
 */
export async function getRecentlyViewedRecipes(): Promise<{
  success: boolean
  recipes?: RecentlyViewedRecipe[]
  message?: string
}> {
  try {
    console.log("[getRecentlyViewedRecipes] 함수 호출됨")
    
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[getRecentlyViewedRecipes] 인증 실패:", { authError, user: !!user })
      return { success: false, message: "로그인이 필요합니다." }
    }

    console.log("[getRecentlyViewedRecipes] 인증 성공, 사용자 ID:", user.id)

    const recipes = await db
      .select({
        id: recentlyViewedRecipes.id,
        recipeName: recentlyViewedRecipes.recipeName,
        youtubeUrl: recentlyViewedRecipes.youtubeUrl,
        videoThumbnail: recentlyViewedRecipes.videoThumbnail,
        channelName: recentlyViewedRecipes.channelName,
        channelId: recentlyViewedRecipes.channelId,
        channelUrl: recentlyViewedRecipes.channelUrl,
        channelThumbnail: recentlyViewedRecipes.channelThumbnail,
        summary: recentlyViewedRecipes.summary,
        viewedAt: recentlyViewedRecipes.viewedAt,
        difficulty: recentlyViewedRecipes.difficulty,
        cookingTimeMinutes: recentlyViewedRecipes.cookingTimeMinutes,
        ingredients: recentlyViewedRecipes.ingredients,
        steps: recentlyViewedRecipes.steps,
        tips: recentlyViewedRecipes.tips,
        videoDescription: recentlyViewedRecipes.videoDescription,
        noRecipeFoundMessage: recentlyViewedRecipes.noRecipeFoundMessage,
        videoDurationSeconds: recentlyViewedRecipes.videoDurationSeconds,
        videoViews: recentlyViewedRecipes.videoViews,
        personalNotes: recentlyViewedRecipes.personalNotes,
        savedRecipeId: recentlyViewedRecipes.savedRecipeId,
      })
      .from(recentlyViewedRecipes)
      .where(eq(recentlyViewedRecipes.userId, user.id))
      .orderBy(desc(recentlyViewedRecipes.viewedAt))
      .limit(5) // 대시보드에서는 5개만

    console.log("[getRecentlyViewedRecipes] 조회 결과:", recipes.length, "개의 레시피")
    console.log("[getRecentlyViewedRecipes] 레시피 목록:", recipes)

    return {
      success: true,
      recipes: recipes.map(recipe => ({
        ...recipe,
        viewedAt: new Date(recipe.viewedAt!)
      }))
    }
  } catch (error) {
    console.error("[getRecentlyViewedRecipes] Error:", error)
    return { success: false, message: "최근 본 레시피 조회 중 오류가 발생했습니다." }
  }
}

/**
 * 최근 본 레시피 추가/업데이트
 */
export async function addRecentlyViewedRecipe(params: AddRecentlyViewedParams): Promise<{
  success: boolean
  message?: string
}> {
  try {
    console.log("[addRecentlyViewedRecipe] 함수 호출됨, params:", params)
    
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[addRecentlyViewedRecipe] 인증 실패:", { authError, user: !!user })
      return { success: false, message: "로그인이 필요합니다." }
    }

    console.log("[addRecentlyViewedRecipe] 인증 성공, 사용자 ID:", user.id)

    // 중복 확인 (videoTitle + channel_name 기준)
    console.log("[addRecentlyViewedRecipe] 중복 확인 시작 - videoTitle:", params.videoTitle || params.recipeName, "channelName:", params.channelName)
    const existingRecipe = await db
      .select({ id: recentlyViewedRecipes.id })
      .from(recentlyViewedRecipes)
      .where(
        and(
          eq(recentlyViewedRecipes.userId, user.id),
          eq(recentlyViewedRecipes.videoTitle, params.videoTitle || params.recipeName),
          eq(recentlyViewedRecipes.channelName, params.channelName || "")
        )
      )
      .limit(1)

    console.log("[addRecentlyViewedRecipe] 중복 확인 결과:", existingRecipe.length > 0 ? "기존 레시피 존재" : "새 레시피")

    if (existingRecipe.length > 0) {
      // 기존 레시피가 있으면 viewed_at만 업데이트
      console.log("[addRecentlyViewedRecipe] 기존 레시피 업데이트, ID:", existingRecipe[0].id)
      await db
        .update(recentlyViewedRecipes)
        .set({ viewedAt: new Date() })
        .where(eq(recentlyViewedRecipes.id, existingRecipe[0].id))
      console.log("[addRecentlyViewedRecipe] 기존 레시피 업데이트 완료")
    } else {
      // 새 레시피 추가
      console.log("[addRecentlyViewedRecipe] 새 레시피 추가 시작")
      const insertResult = await db.insert(recentlyViewedRecipes).values({
        userId: user.id,
        videoTitle: params.videoTitle || params.recipeName, // 실제 YouTube 비디오 제목 우선, 없으면 레시피명
        recipeName: params.recipeName,
        youtubeUrl: params.youtubeUrl,
        videoThumbnail: params.videoThumbnail,
        channelName: params.channelName || "",
        channelId: params.channelId,
        channelUrl: params.channelUrl,
        channelThumbnail: params.channelThumbnail,
        summary: params.summary,
        difficulty: params.difficulty,
        cookingTimeMinutes: params.cookingTimeMinutes,
        ingredients: params.ingredients,
        steps: params.steps,
        tips: params.tips,
        videoDescription: params.videoDescription,
        noRecipeFoundMessage: params.noRecipeFoundMessage,
        videoDurationSeconds: params.videoDurationSeconds,
        videoViews: params.videoViews,
        savedRecipeId: params.savedRecipeId,
        viewedAt: new Date(),
      })
      console.log("[addRecentlyViewedRecipe] 새 레시피 추가 완료:", insertResult)

      // 최대 개수 초과 시 가장 오래된 기록 삭제
      console.log("[addRecentlyViewedRecipe] 최대 개수 확인 시작")
      const allRecipes = await db
        .select({ id: recentlyViewedRecipes.id })
        .from(recentlyViewedRecipes)
        .where(eq(recentlyViewedRecipes.userId, user.id))
        .orderBy(desc(recentlyViewedRecipes.viewedAt))

      console.log("[addRecentlyViewedRecipe] 현재 레시피 개수:", allRecipes.length, "최대:", MAX_RECENTLY_VIEWED)

      if (allRecipes.length > MAX_RECENTLY_VIEWED) {
        const recipesToDelete = allRecipes.slice(MAX_RECENTLY_VIEWED)
        console.log("[addRecentlyViewedRecipe] 삭제할 레시피 개수:", recipesToDelete.length)
        for (const recipe of recipesToDelete) {
          await db
            .delete(recentlyViewedRecipes)
            .where(eq(recentlyViewedRecipes.id, recipe.id))
        }
        console.log("[addRecentlyViewedRecipe] 오래된 레시피 삭제 완료")
      }
    }

    console.log("[addRecentlyViewedRecipe] 성공적으로 완료")
    return { success: true }
  } catch (error) {
    console.error("[addRecentlyViewedRecipe] Error:", error)
    return { success: false, message: "최근 본 레시피 추가 중 오류가 발생했습니다." }
  }
}

/**
 * 최근 본 레시피에서 중복 확인
 */
export async function checkRecentlyViewedDuplicate(
  videoTitle: string,
  channelName: string
): Promise<{
  isDuplicate: boolean
  recentlyViewedData?: {
    recipeName: string
    youtubeUrl: string
    videoThumbnail?: string
    channelName?: string
    summary?: string
  }
}> {
  try {
    console.log("[checkRecentlyViewedDuplicate] 시작 - videoTitle:", videoTitle, "channelName:", channelName)
    
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[checkRecentlyViewedDuplicate] 인증 실패")
      return { isDuplicate: false }
    }

    console.log("[checkRecentlyViewedDuplicate] 사용자 ID:", user.id)

    const duplicate = await db
      .select({
        recipeName: recentlyViewedRecipes.recipeName,
        youtubeUrl: recentlyViewedRecipes.youtubeUrl,
        videoThumbnail: recentlyViewedRecipes.videoThumbnail,
        channelName: recentlyViewedRecipes.channelName,
        summary: recentlyViewedRecipes.summary,
      })
      .from(recentlyViewedRecipes)
      .where(
        and(
          eq(recentlyViewedRecipes.userId, user.id),
          eq(recentlyViewedRecipes.videoTitle, videoTitle),
          eq(recentlyViewedRecipes.channelName, channelName)
        )
      )
      .limit(1)

    console.log("[checkRecentlyViewedDuplicate] 검색 결과:", duplicate.length, "개")

    if (duplicate.length > 0) {
      console.log("[checkRecentlyViewedDuplicate] 중복 발견:", duplicate[0])
      return {
        isDuplicate: true,
        recentlyViewedData: duplicate[0]
      }
    }

    console.log("[checkRecentlyViewedDuplicate] 중복 없음")
    return { isDuplicate: false }
  } catch (error) {
    console.error("[checkRecentlyViewedDuplicate] Error:", error)
    return { isDuplicate: false }
  }
}