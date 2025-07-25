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
  summary?: string
  viewedAt: Date
}

interface AddRecentlyViewedParams {
  recipeName: string
  youtubeUrl: string
  videoThumbnail?: string
  channelName?: string
  summary?: string
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
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: "로그인이 필요합니다." }
    }

    const recipes = await db
      .select({
        id: recentlyViewedRecipes.id,
        recipeName: recentlyViewedRecipes.recipeName,
        youtubeUrl: recentlyViewedRecipes.youtubeUrl,
        videoThumbnail: recentlyViewedRecipes.videoThumbnail,
        channelName: recentlyViewedRecipes.channelName,
        summary: recentlyViewedRecipes.summary,
        viewedAt: recentlyViewedRecipes.viewedAt,
      })
      .from(recentlyViewedRecipes)
      .where(eq(recentlyViewedRecipes.userId, user.id))
      .orderBy(desc(recentlyViewedRecipes.viewedAt))
      .limit(3) // 대시보드에서는 3개만

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
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: "로그인이 필요합니다." }
    }

    // 중복 확인 (video_title + channel_name 기준)
    const existingRecipe = await db
      .select({ id: recentlyViewedRecipes.id })
      .from(recentlyViewedRecipes)
      .where(
        and(
          eq(recentlyViewedRecipes.userId, user.id),
          eq(recentlyViewedRecipes.recipeName, params.recipeName),
          eq(recentlyViewedRecipes.channelName, params.channelName || "")
        )
      )
      .limit(1)

    if (existingRecipe.length > 0) {
      // 기존 레시피가 있으면 viewed_at만 업데이트
      await db
        .update(recentlyViewedRecipes)
        .set({ viewedAt: new Date() })
        .where(eq(recentlyViewedRecipes.id, existingRecipe[0].id))
    } else {
      // 새 레시피 추가
      await db.insert(recentlyViewedRecipes).values({
        userId: user.id,
        recipeName: params.recipeName,
        youtubeUrl: params.youtubeUrl,
        videoThumbnail: params.videoThumbnail,
        channelName: params.channelName,
        summary: params.summary,
        viewedAt: new Date(),
      })

      // 최대 개수 초과 시 가장 오래된 기록 삭제
      const allRecipes = await db
        .select({ id: recentlyViewedRecipes.id })
        .from(recentlyViewedRecipes)
        .where(eq(recentlyViewedRecipes.userId, user.id))
        .orderBy(desc(recentlyViewedRecipes.viewedAt))

      if (allRecipes.length > MAX_RECENTLY_VIEWED) {
        const recipesToDelete = allRecipes.slice(MAX_RECENTLY_VIEWED)
        for (const recipe of recipesToDelete) {
          await db
            .delete(recentlyViewedRecipes)
            .where(eq(recentlyViewedRecipes.id, recipe.id))
        }
      }
    }

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
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { isDuplicate: false }
    }

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
          eq(recentlyViewedRecipes.recipeName, videoTitle),
          eq(recentlyViewedRecipes.channelName, channelName)
        )
      )
      .limit(1)

    if (duplicate.length > 0) {
      return {
        isDuplicate: true,
        recentlyViewedData: duplicate[0]
      }
    }

    return { isDuplicate: false }
  } catch (error) {
    console.error("[checkRecentlyViewedDuplicate] Error:", error)
    return { isDuplicate: false }
  }
}