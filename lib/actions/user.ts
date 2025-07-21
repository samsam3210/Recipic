"use server"

import { db } from "@/lib/db"
import { profiles } from "@/lib/db/schema" // profiles 스키마 임포트
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { User } from "@supabase/supabase-js" // User 타입 임포트

interface UpdateUserNameResult {
  success: boolean
  message: string
}

export async function updateUserName(newName: string): Promise<UpdateUserNameResult> {
  const supabase = createClient()
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser()

  if (getUserError || !user) {
    console.error("[updateUserName] User not authenticated:", getUserError?.message || "No user")
    return { success: false, message: "로그인된 사용자만 프로필을 수정할 수 있습니다." }
  }

  try {
    // profiles 테이블의 nickname 업데이트
    const result = await db
      .update(profiles)
      .set({ nickname: newName, updatedAt: new Date() })
      .where(eq(profiles.userId, user.id)) // profiles.id -> profiles.userId 수정
      .returning({ userId: profiles.userId })

    if (result.length === 0) {
      // 프로필이 없는 경우 (매우 드물지만, 혹시 모를 상황 대비)
      console.warn("[updateUserName] No existing profile found for user. Attempting to create one.")
      const initialNickname = user.user_metadata?.full_name || user.email?.split("@")[0] || "새로운 사용자"
      await db.insert(profiles).values({
        userId: user.id,
        nickname: initialNickname,
        avatarUrl: user.user_metadata?.avatar_url || null, // Google 아바타 URL 초기값으로 사용
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Revalidate paths to ensure fresh data is fetched
    revalidatePath("/settings")
    revalidatePath("/dashboard")
    revalidatePath("/", "layout") // Invalidate layout cache to update header

    return { success: true, message: "프로필 이름이 성공적으로 업데이트되었습니다." }
  } catch (error) {
    console.error("[updateUserName] Unexpected error during update:", error)
    return { success: false, message: `프로필 이름 업데이트 중 오류 발생: ${(error as Error).message}` }
  }
}

interface UserProfile {
  userId: string
  nickname: string
  avatarUrl: string | null
}

/**
 * 사용자의 프로필을 가져오거나, 없으면 새로 생성합니다.
 * 로그인 시 호출되어 사용자 닉네임을 초기화하는 데 사용됩니다.
 */
export async function getOrCreateUserProfile(user: User): Promise<UserProfile> {
  try {
    const [existingProfile] = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1) // profiles.id -> profiles.userId 수정

    if (existingProfile) {
      return existingProfile
    } else {
      // 프로필이 없는 경우 새로 생성
      const initialNickname = user.user_metadata?.full_name || user.email?.split("@")[0] || "새로운 사용자"
      const initialAvatarUrl = user.user_metadata?.avatar_url || null

      const [newProfile] = await db
        .insert(profiles)
        .values({
          userId: user.id,
          nickname: initialNickname,
          avatarUrl: initialAvatarUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      if (!newProfile) {
        throw new Error("Failed to create new user profile.")
      }
      return newProfile
    }
  } catch (error) {
    console.error("[getOrCreateUserProfile] Error fetching or creating user profile:", error)
    // 오류 발생 시 기본값 반환 또는 오류 처리
    return {
      userId: user.id,
      nickname: user.user_metadata?.full_name || user.email?.split("@")[0] || "오류 발생 사용자",
      avatarUrl: user.user_metadata?.avatar_url || null,
    }
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1) // profiles.id -> profiles.userId 수정
    return profile || null
  } catch (error) {
    console.error("[getUserProfile] Error fetching user profile:", error)
    return null
  }
}

/**
 * 현재 로그인된 사용자의 ID를 가져옵니다.
 * @returns 사용자의 ID (string) 또는 인증되지 않은 경우 null
 */
export async function getUserId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    console.error("[getUserId] Error fetching user:", error?.message || "No user found")
    return null
  }
  return user.id
}
