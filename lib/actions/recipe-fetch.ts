"use server"

import { db } from "@/lib/db"
import { recipes, folders, recipeFolders } from "@/lib/db/schema"
import { eq, and, asc, desc, inArray } from "drizzle-orm"
import { createClient } from "@/lib/supabase/server" // Supabase 클라이언트 임포트

// 기존 함수: 모든 레시피를 가져오는 역할 (getAllRecipes 역할)
// selectedFolderId가 null이면 모든 레시피 (폴더에 속하지 않은 레시피 포함)
// selectedFolderId가 특정 ID면 해당 폴더의 레시피
export async function fetchRecipesAndFolders(userId: string, selectedFolderId: string | null) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== userId) {
    // 보안: 요청한 userId와 실제 로그인된 userId가 다르면 에러
    return { recipes: [], folders: [], error: "Unauthorized" }
  }

  let fetchedRecipes = []
  if (selectedFolderId === null) {
    // '모든 레시피' 선택 시: userId에 해당하는 모든 레시피를 가져옵니다.
    fetchedRecipes = await db.select().from(recipes).where(eq(recipes.userId, userId)).orderBy(desc(recipes.createdAt))
  } else {
    // 특정 폴더 선택 시: recipeFolders 테이블을 조인하여 해당 폴더에 속한 레시피만 가져옵니다.
    const folderRecipes = await db
      .select({ recipeId: recipeFolders.recipeId })
      .from(recipeFolders)
      .where(eq(recipeFolders.folderId, selectedFolderId))

    const recipeIds = folderRecipes.map((fr) => fr.recipeId)

    if (recipeIds.length > 0) {
      fetchedRecipes = await db
        .select()
        .from(recipes)
        .where(and(eq(recipes.userId, userId), inArray(recipes.id, recipeIds)))
        .orderBy(desc(recipes.createdAt))
    } else {
      // 폴더에 레시피가 없는 경우
      fetchedRecipes = []
    }
  }

  const fetchedFolders = await db.select().from(folders).where(eq(folders.userId, userId)).orderBy(asc(folders.name))

  return { recipes: fetchedRecipes, folders: fetchedFolders, error: null }
}

// 새로운 getPaginatedRecipes 함수 (페이지네이션 적용)
interface GetPaginatedRecipesOptions {
  userId: string
  page?: number
  limit?: number
  folderId?: string | null
}

interface PaginatedRecipesResult {
  recipes: (typeof recipes.$inferSelect)[]
  hasMore: boolean
  error: string | null
}

export async function getPaginatedRecipes({
  userId,
  page = 1,
  limit = 20,
  folderId,
}: GetPaginatedRecipesOptions): Promise<PaginatedRecipesResult> {
  if (!userId) {
    return { recipes: [], hasMore: false, error: "User not authenticated." }
  }

  const offset = (page - 1) * limit

  try {
    const queryConditions = [eq(recipes.userId, userId)]
    let fetchedRecipes: (typeof recipes.$inferSelect)[] = []

    if (folderId) {
      // If folderId is provided, filter by recipes in that folder
      const folderRecipes = await db
        .select({ recipeId: recipeFolders.recipeId })
        .from(recipeFolders)
        .where(eq(recipeFolders.folderId, folderId))

      const recipeIds = folderRecipes.map((fr) => fr.recipeId)

      if (recipeIds.length === 0) {
        // No recipes in this folder, so return empty
        return { recipes: [], hasMore: false, error: null }
      }
      queryConditions.push(inArray(recipes.id, recipeIds))
    }

    fetchedRecipes = await db.query.recipes.findMany({
      where: and(...queryConditions),
      orderBy: [desc(recipes.createdAt)],
      limit: limit + 1, // Fetch one more to check if there's a next page
      offset: offset,
    })

    const hasMore = fetchedRecipes.length > limit
    const recipesToSend = fetchedRecipes.slice(0, limit)

    return { recipes: recipesToSend, hasMore, error: null }
  } catch (error: any) {
    console.error("Error fetching paginated recipes:", error)
    return { recipes: [], hasMore: false, error: `Failed to fetch paginated recipes: ${error.message}` }
  }
}

// 기존 fetchRecentRecipes 함수 (최근 레시피만 가져오는 함수)
export async function fetchRecentRecipes(userId: string, limit = 3) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.id !== userId) {
    return { recipes: [], error: "Unauthorized" }
  }

  try {
    const recentRecipes = await db
      .select({
        id: recipes.id,
        recipeName: recipes.recipeName,
        videoThumbnail: recipes.videoThumbnail,
        channelName: recipes.channelName,
        summary: recipes.summary,
        cookingTimeMinutes: recipes.cookingTimeMinutes,
        difficulty: recipes.difficulty,
      })
      .from(recipes)
      .where(eq(recipes.userId, userId))
      .orderBy(desc(recipes.createdAt))
      .limit(limit)

    return { recipes: recentRecipes, error: null }
  } catch (error) {
    console.error("Error fetching recent recipes:", error)
    return { recipes: [], error: `Failed to fetch recent recipes: ${(error as Error).message}` }
  }
}
