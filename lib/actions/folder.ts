"use server"

import { db } from "@/lib/db"
import { folders, recipeFolders, recipes } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getUserId } from "@/lib/actions/user"

export async function createFolder(name: string) {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, message: "User not authenticated." }
  }
  try {
    const [newFolder] = await db
      .insert(folders)
      .values({
        userId,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    revalidatePath("/recipes")
    return { success: true, message: "폴더가 생성되었습니다.", folder: newFolder }
  } catch (error: any) {
    console.error("Error creating folder:", error)
    return { success: false, message: `폴더 생성 실패: ${error.message}` }
  }
}

export async function updateFolder(folderId: string, newName: string) {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, message: "User not authenticated." }
  }
  try {
    const result = await db
      .update(folders)
      .set({ name: newName, updatedAt: new Date() })
      .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
      .returning()
    if (result.length === 0) {
      return { success: false, message: "폴더를 찾을 수 없거나 수정 권한이 없습니다." }
    }
    revalidatePath("/recipes")
    return { success: true, message: "폴더 이름이 업데이트되었습니다.", folder: result[0] }
  } catch (error: any) {
    console.error("Error updating folder:", error)
    return { success: false, message: `폴더 업데이트 실패: ${error.message}` }
  }
}

export async function deleteFolder(folderId: string) {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, message: "User not authenticated." }
  }
  try {
    // 해당 폴더에 속한 레시피들의 연결을 recipeFolders 테이블에서 삭제
    await db.delete(recipeFolders).where(eq(recipeFolders.folderId, folderId)).execute()

    // 그 다음 폴더 삭제
    const result = await db
      .delete(folders)
      .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
      .execute()

    if (result.rowsAffected === 0) {
      return { success: false, message: "폴더를 찾을 수 없거나 삭제 권한이 없습니다." }
    }
    revalidatePath("/recipes")
    return { success: true, message: "폴더가 삭제되었습니다." }
  } catch (error: any) {
    console.error("Error deleting folder:", error)
    return { success: false, message: `폴더 삭제 실패: ${error.message}` }
  }
}

// 레시피를 폴더로 이동하는 서버 액션 (recipeFolders 테이블 사용)
export async function moveRecipeToFolder(recipeId: string, folderId: string | null) {
  const userId = await getUserId()
  if (!userId) {
    return { success: false, message: "User not authenticated." }
  }

  try {
    // 레시피가 사용자 소유인지 확인
    const [recipe] = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.userId, userId)))
      .limit(1)
    if (!recipe) {
      return { success: false, message: "레시피를 찾을 수 없거나 이동 권한이 없습니다." }
    }

    // 기존 연결 제거 (레시피는 하나의 폴더에만 속한다고 가정)
    await db.delete(recipeFolders).where(eq(recipeFolders.recipeId, recipeId)).execute()

    if (folderId) {
      // 새 폴더로 연결 추가
      await db
        .insert(recipeFolders)
        .values({
          recipeId: recipeId,
          folderId: folderId,
          createdAt: new Date(),
        })
        .execute()
    }

    revalidatePath("/recipes")
    revalidatePath("/dashboard")
    return { success: true, message: "레시피가 성공적으로 이동되었습니다." }
  } catch (error: any) {
    console.error("Error moving recipe to folder:", error)
    return { success: false, message: `레시피 이동 실패: ${error.message}` }
  }
}
