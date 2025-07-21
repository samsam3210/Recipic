"use server"

import { db } from "@/lib/db"
import { dailyUsage } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { createClient } from "@/lib/supabase/server"

const DAILY_LIMIT = 2
const ADMIN_EMAIL = "helpme2183@gmail.com" // 관리자 계정 이메일

// 한국 시간(KST) 기준으로 오늘 날짜를 'YYYY-MM-DD' 형식의 문자열로 반환합니다.
function getKstTodayDateString(): string {
  const now = new Date()
  // 'en-CA' 로케일은 YYYY-MM-DD 형식을 기본으로 합니다.
  // timeZone: 'Asia/Seoul'을 사용하여 한국 시간으로 날짜를 얻습니다.
  const formatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  })
  const kstDate = formatter.format(now)
  return kstDate // "YYYY-MM-DD" 형식 그대로 반환
}

interface UsageResult {
  success: boolean
  message: string
  currentCount?: number
  limitExceeded?: boolean
  isAllowed?: boolean // 사용 허용 여부
  isAdmin?: boolean // 관리자 계정 여부 추가
}

/**
 * 현재 사용자의 오늘 레시피 조회 사용량을 확인합니다.
 * 관리자 계정은 항상 허용됩니다.
 */
export async function checkDailyUsage(): Promise<UsageResult> {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    console.warn("[checkDailyUsage] User not authenticated or error getting user:", authError?.message || "No user")
    return { success: true, message: "로그인되지 않은 사용자", isAllowed: true, currentCount: 0 }
  }

  // 관리자 계정 예외 처리
  if (user.email === ADMIN_EMAIL) {
    return { success: true, message: "관리자 계정", isAllowed: true, currentCount: 0, isAdmin: true }
  }

  const todayKst = getKstTodayDateString()

  try {
    const [usageRecord] = await db
      .select()
      .from(dailyUsage)
      .where(and(eq(dailyUsage.userId, user.id), eq(dailyUsage.usageDate, todayKst)))
      .limit(1)

    const currentCount = usageRecord ? usageRecord.count : 0
    const limitExceeded = currentCount >= DAILY_LIMIT
    const isAllowed = !limitExceeded

    return {
      success: true,
      message: "사용량 확인 완료",
      currentCount,
      limitExceeded,
      isAllowed,
      isAdmin: false,
    }
  } catch (error) {
    console.error("[checkDailyUsage] Error checking daily usage:", error)
    // 데이터베이스 오류 발생 시 사용을 허용하지 않음
    return {
      success: false,
      message: `사용량 확인 실패: ${(error as Error).message}`,
      isAllowed: false,
      currentCount: 0,
      isAdmin: false,
    }
  }
}

/**
 * 현재 사용자의 오늘 레시피 조회 사용량을 1 증가시킵니다.
 * 관리자 계정은 사용량 증가 대상에서 제외됩니다.
 */
export async function incrementDailyUsage(): Promise<UsageResult> {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    console.warn("[incrementDailyUsage] User not authenticated or error getting user:", authError?.message || "No user")
    return { success: false, message: "로그인되지 않은 사용자" }
  }

  // 관리자 계정은 사용량 증가 대상에서 제외
  if (user.email === ADMIN_EMAIL) {
    return { success: true, message: "관리자 계정 사용량 증가 제외" }
  }

  const todayKst = getKstTodayDateString()

  try {
    const result = await db
      .insert(dailyUsage)
      .values({
        userId: user.id,
        usageDate: todayKst,
        count: 1,
      })
      .onConflictDoUpdate({
        target: [dailyUsage.userId, dailyUsage.usageDate],
        set: {
          count: sql`${dailyUsage.count} + 1`,
        },
      })
      .returning({
        count: dailyUsage.count,
        userId: dailyUsage.userId,
        usageDate: dailyUsage.usageDate,
      })

    const newCount = result[0]?.count || 0

    return { success: true, message: "사용량 증가 완료", currentCount: newCount }
  } catch (error) {
    console.error("[incrementDailyUsage] Error incrementing daily usage:", error)
    return { success: false, message: `사용량 증가 실패: ${(error as Error).message}` }
  }
}