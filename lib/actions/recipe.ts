"use server"

import { db } from "@/lib/db"
import { recipes } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getUserId } from "@/lib/actions/user" // getUserId 임포트 추가
import { updatePopularityScore } from "@/lib/actions/popular-recipes"

interface UpdateRecipeData {
  recipeName?: string | null
  summary?: string | null
  difficulty?: string | null
  cookingTimeMinutes?: number | null
  personalNotes?: string | null
  ingredients?: any // JSONB 필드 추가
  steps?: any // JSONB 필드 추가
  tips?: any // JSONB 필드 추가
}

// 새로운 레시피를 생성하는 서버 액션
interface CreateRecipeData {
  youtubeUrl: string
  videoTitle: string | null
  videoThumbnail: string | null
  channelName: string | null
  videoDurationSeconds: number | null
  videoViews: number | null
  videoDescription: string | null
  recipeName: string | null
  noRecipeFoundMessage: string | null
  summary: string | null
  difficulty: string | null
  cookingTimeMinutes: number | null
  ingredients: any // JSONB 타입에 맞게 any 또는 정확한 타입 정의
  steps: any
  tips: any
  personalNotes: string | null // personalNotes는 항상 string 또는 null이어야 함
}

// processAndSaveRecipeForLoggedInUser의 반환 타입 정의
interface ProcessRecipeResult {
  success: boolean
  message: string
  recipeId?: string // 성공 시 레시피 ID
  isDuplicate?: boolean // 중복 레시피인 경우 true
}

// ADDED: checkDuplicateRecipe의 반환 타입 정의
interface DuplicateCheckResult {
  success: boolean
  message: string
  isDuplicate: boolean
  recipeId?: string
}

export async function createRecipe(recipeData: CreateRecipeData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: "로그인된 사용자만 레시피를 저장할 수 있습니다." }
  }

  try {
    const result = await db
      .insert(recipes)
      .values({
        userId: user.id,
        youtubeUrl: recipeData.youtubeUrl,
        videoTitle: recipeData.videoTitle,
        videoThumbnail: recipeData.videoThumbnail,
        channelName: recipeData.channelName,
        videoDurationSeconds: recipeData.videoDurationSeconds,
        videoViews: recipeData.videoViews,
        videoDescription: recipeData.videoDescription,
        recipeName: recipeData.recipeName,
        noRecipeFoundMessage: recipeData.noRecipeFoundMessage,
        summary: recipeData.summary,
        difficulty: recipeData.difficulty,
        cookingTimeMinutes: recipeData.cookingTimeMinutes,
        ingredients: recipeData.ingredients,
        steps: recipeData.steps,
        tips: recipeData.tips,
        personalNotes: recipeData.personalNotes,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: recipes.id })

    if (result.length === 0) {
      throw new Error("레시피 저장에 실패했습니다.")
    }
    // ✨ 새로 추가: 인기도 업데이트
    console.log('🔥 레시피 저장 완료, 인기도 업데이트 시작:', recipeData.recipeName)
    await updatePopularityScore(recipeData.recipeName)
    console.log('🔥 인기도 업데이트 완료')

    revalidatePath("/recipes") // 전체 레이아웃 대신 /recipes 페이지 캐시 무효화
    revalidatePath("/dashboard") // 대시보드 페이지 캐시 무효화 (최근 레시피 업데이트)
    return { success: true, message: "레시피가 성공적으로 저장되었습니다.", recipeId: result[0].id }
  } catch (error) {
    console.error("[createRecipe] Error creating recipe:", error)
    return { success: false, message: `레시피 저장 실패: ${(error as Error).message}` }
  }
}

export async function updateRecipe(recipeId: string, updates: UpdateRecipeData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: "로그인된 사용자만 레시피를 업데이트할 수 있습니다." }
  }

  try {
    const result = await db
      .update(recipes)
      .set({
        ...updates,
        updatedAt: new Date(), // 업데이트 시간 갱신
      })
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, user.id))) // 사용자 ID도 함께 확인
      .returning({ id: recipes.id }) // 업데이트된 레시피의 ID 반환

    if (result.length === 0) {
      throw new Error("Recipe not found or not authorized to update.")
    }

    revalidatePath("/recipes") // 전체 레이아웃 대신 /recipes 페이지 캐시 무효화
    revalidatePath("/dashboard") // 대시보드 페이지 캐시 무효화 (최근 레시피 업데이트)
    revalidatePath(`/recipe/${recipeId}`) // 해당 레시피 상세 페이지 캐시 무효화
    return { success: true, message: "레시피가 성공적으로 업데이트되었습니다." }
  } catch (error) {
    console.error("[updateRecipe] Error updating recipe:", error)
    return { success: false, message: `레시피 업데이트 실패: ${(error as Error).message}` }
  }
}

// MODIFIED: savePersonalNotes function
export async function savePersonalNotes(recipeId: string, notes: string | null) {
  const userId = await getUserId()

  if (!userId) {
    return { success: false, message: "사용자 인증에 실패했습니다." }
  }

  try {
    await db
      .update(recipes)
      .set({ personalNotes: notes })
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId))) // Ensure only the user's own recipe is updated

    return { success: true, message: "개인 메모가 성공적으로 저장되었습니다." }
  } catch (error) {
    console.error("Error saving personal notes:", error)
    return { success: false, message: "개인 메모 저장에 실패했습니다." }
  }
}

// Add the getRecipeById function after savePersonalNotes:
export async function getRecipeById(recipeId: string) {
  const userId = await getUserId()

  if (!userId) {
    return null // Not authorized
  }

  try {
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
      .limit(1)
    return recipe
  } catch (error) {
    console.error("[getRecipeById] Error fetching recipe by ID:", error)
    return null
  }
}

// MODIFIED: 중복 레시피만 확인하는 서버 액션 (videoTitle과 channelName만 사용)
export async function checkDuplicateRecipe(videoTitle: string, channelName: string): Promise<DuplicateCheckResult> {
  const userId = await getUserId()

  if (!userId) {
    return { success: false, message: "사용자 인증에 실패했습니다.", isDuplicate: false }
  }

  // 비디오 타이틀이나 채널 이름이 없는 경우, 중복 확인을 수행할 수 없습니다.
  if (!videoTitle || !channelName) {
    console.warn(
      "[checkDuplicateRecipe] videoTitle or channelName is null/empty. Cannot perform duplicate check based on these criteria.",
    )
    return {
      success: true,
      message: "비디오 제목 또는 채널 이름이 없어 중복 확인을 수행할 수 없습니다.",
      isDuplicate: false,
    }
  }

  try {
    const existingRecipe = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.userId, userId), eq(recipes.videoTitle, videoTitle), eq(recipes.channelName, channelName)))
      .limit(1)

    if (existingRecipe.length > 0) {
      return {
        success: true,
        message: "이미 저장된 레시피입니다.",
        isDuplicate: true,
        recipeId: existingRecipe[0].id,
      }
    } else {
      return { success: true, message: "중복 레시피가 없습니다.", isDuplicate: false }
    }
  } catch (error) {
    console.error("[checkDuplicateRecipe] Error checking duplicate recipe:", error)
    return { success: false, message: `중복 확인 실패: ${(error as Error).message}`, isDuplicate: false }
  }
}

// 기존 processAndSaveRecipeForLoggedInUser를 checkAndSaveRecipe로 변경
// 이 함수는 이제 클라이언트에서 이미 추출된 videoInfo와 extractedRecipe를 받습니다.
export async function checkAndSaveRecipe(
  youtubeUrl: string,
  videoInfo: {
    videoId: string
    videoTitle: string
    videoThumbnail: string
    channelName: string
    videoDurationSeconds: number
    videoViews: number
    videoDescription: string
    transcriptText: string
    structuredTranscript: { text: string; offset: number }[]
    hasSubtitles: boolean
  }, // 클라이언트에서 전달받은 videoInfo
  extractedRecipe: any | null, // 클라이언트에서 전달받은 extractedRecipe (null일 수 있음)
  forceReExtract = false, // 강제 재추출 옵션 추가
): Promise<ProcessRecipeResult> {
  const userId = await getUserId()

  if (!userId) {
    return { success: false, message: "사용자 인증에 실패했습니다." }
  }

  // extractedRecipe가 null이면, 중복 확인만 수행하고 저장하지 않습니다.
  if (!extractedRecipe) {
    console.warn("[checkAndSaveRecipe] No extractedRecipe provided, performing only duplicate check.")
    return { success: true, message: "중복 확인 완료, 레시피 데이터 없음", isDuplicate: false }
  }

  try {
    // Step 2: Save the recipe to the database (videoInfo와 extractedRecipe는 이미 클라이언트에서 처리됨)
    const recipeToSave: CreateRecipeData = {
      // CreateRecipeData 타입 명시
      youtubeUrl: youtubeUrl,
      videoTitle: videoInfo.videoTitle,
      videoThumbnail: videoInfo.videoThumbnail,
      channelName: videoInfo.channelName,
      videoDurationSeconds: videoInfo.videoDurationSeconds,
      videoViews: videoInfo.videoViews,
      videoDescription: videoInfo.videoDescription,
      recipeName: extractedRecipe.recipeName,
      noRecipeFoundMessage: extractedRecipe.noRecipeFoundMessage,
      summary: extractedRecipe.summary,
      difficulty: extractedRecipe.difficulty,
      cookingTimeMinutes: extractedRecipe.cookingTimeMinutes,
      ingredients: extractedRecipe.ingredients,
      steps: extractedRecipe.steps,
      tips: extractedRecipe.tips,
      personalNotes: extractedRecipe.personalNotes || null,
    }

    const saveResult = await createRecipe(recipeToSave)

    if (saveResult.success && saveResult.recipeId) {
      revalidatePath(`/recipe/${saveResult.recipeId}`)
      revalidatePath("/recipes") // /recipes 페이지 캐시 무효화
      revalidatePath("/dashboard") // /dashboard 페이지 캐시 무효화
      return { success: true, message: "레시피가 성공적으로 저장되었습니다.", recipeId: saveResult.recipeId }
    } else {
      throw new Error(saveResult.message || "레시피 저장에 실패했습니다.")
    }
  } catch (error) {
    console.error("[checkAndSaveRecipe] Error processing and saving recipe for logged-in user:", error)
    return { success: false, message: `레시피 처리 및 저장 실패: ${(error as Error).message}` }
  }
}

// 레시피 삭제 서버 액션 추가
export async function deleteRecipe(recipeId: string): Promise<{ success: boolean; message: string }> {
  const userId = await getUserId()

  if (!userId) {
    return { success: false, message: "사용자 인증에 실패했습니다." }
  }

  try {
    const result = await db
      .delete(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
      .returning({ id: recipes.id })

    if (result.length === 0) {
      throw new Error("레시피를 찾을 수 없거나 삭제 권한이 없습니다.")
    }

    revalidatePath("/recipes") // /recipes 페이지 캐시 무효화
    revalidatePath("/dashboard") // 대시보드 페이지 캐시 무효화 (최근 레시피 업데이트)
    revalidatePath(`/recipe/${recipeId}`) // 삭제된 레시피 상세 페이지 캐시 무효화
    return { success: true, message: "레시피가 성공적으로 삭제되었습니다." }
  } catch (error) {
    console.error("[deleteRecipe] Error deleting recipe:", error)
    return { success: false, message: `레시피 삭제 실패: ${(error as Error).message}` }
  }
}
