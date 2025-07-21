"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function signInWithGoogle() {
  const supabase = createClient()

  const nextPublicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL
  console.log(`[Auth Action signInWithGoogle] NEXT_PUBLIC_BASE_URL used for redirectTo: ${nextPublicBaseUrl}`)

  if (!nextPublicBaseUrl) {
    console.error("[Auth Action signInWithGoogle] NEXT_PUBLIC_BASE_URL is not set. Cannot proceed with OAuth.")
    return { success: false, message: "환경 변수 NEXT_PUBLIC_BASE_URL이 설정되지 않았습니다." }
  }

  const redirectToUrl = `${nextPublicBaseUrl}/auth/callback`
  console.log(`[Auth Action signInWithGoogle] Constructed redirectTo URL: ${redirectToUrl}`)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectToUrl,
    },
  })

  if (error) {
    console.error("[Auth Action signInWithGoogle] Error signing in with Google:", error)
    return { success: false, message: error.message || "Google 로그인 시작 실패" }
  }

  if (data.url) {
    console.log(`[Auth Action signInWithGoogle] Redirecting to Google OAuth URL: ${data.url}`)
    return { success: true, url: data.url }
  }

  return { success: false, message: "알 수 없는 로그인 오류" }
}

export async function signOut() {
  const supabase = createClient()
  console.log("[Auth Action signOut] Attempting to sign out via Supabase...")
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error("[Auth Action signOut] Error signing out from Supabase:", error)
    return { success: false, message: error.message || "로그아웃 실패" }
  }

  console.log("[Auth Action signOut] Supabase signOut successful. Revalidating path.")
  revalidatePath("/", "layout") // 전체 레이아웃 캐시 무효화
  return { success: true, message: "로그아웃 성공" }
}
