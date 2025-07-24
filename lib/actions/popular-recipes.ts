"use server"

import { db } from "@/lib/db"
import { popularRecipesDaily, popularRecipesSummary } from "@/lib/db/schema"
import { eq, and, sql, desc } from "drizzle-orm"
import { unstable_cache } from "next/cache"
import { revalidateTag } from "next/cache"

// 현재 년월 가져오기 (YYYY-MM 형태)
function getCurrentYearMonth(): string {
  return new Date().toISOString().substring(0, 7) // "2025-08"
}

// 레시피 저장시 인기도 업데이트
export async function updatePopularityScore(recipeName: string | null) {
    console.log('🎯 updatePopularityScore 호출됨:', recipeName)
    
    if (!recipeName) {
      console.log('❌ recipeName이 null')
      return { success: false, message: "레시피명이 없습니다." }
    }
    
    console.log('✅ recipeName 있음, 처리 시작')
  
  const yearMonth = getCurrentYearMonth()
  
  try {
    // 1. Daily 테이블에 기록
    console.log('📝 Daily 테이블 저장 시작:', recipeName, yearMonth)
    await db.insert(popularRecipesDaily).values({
        recipeName,
        yearMonth,
        saveDate: sql`CURRENT_DATE`,
    })
    console.log('✅ Daily 테이블 저장 완료')
    
    // 2. Summary 테이블 업데이트
    console.log('📊 Summary 테이블 업데이트 시작')
    await updateSummaryTable(recipeName, yearMonth)
    console.log('✅ Summary 테이블 업데이트 완료')
    
    // 3. 캐시 무효화
    console.log('🔄 캐시 무효화 시작')
    revalidateTag('popular-recipes')
    console.log('✅ 캐시 무효화 완료')
    
    return { success: true, message: "인기도 업데이트 완료" }
} catch (error) {
    console.error("❌ Error updating popularity score:", error)
    return { success: false, message: `인기도 업데이트 실패: ${(error as Error).message}` }
}
}

// Summary 테이블 업데이트 로직
async function updateSummaryTable(recipeName: string, yearMonth: string) {
    console.log('📊 updateSummaryTable 시작:', recipeName, yearMonth)
    
    try {
      console.log('📈 통계 쿼리 실행 중...')
      
      // Drizzle select 방식으로 변경
      const stats = await db.select({
        recent_count: sql<number>`COUNT(CASE WHEN save_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::integer`,
        old_count: sql<number>`COUNT(CASE WHEN save_date < CURRENT_DATE - INTERVAL '7 days' AND save_date >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END)::integer`
      }).from(popularRecipesDaily)
      .where(and(
        eq(popularRecipesDaily.recipeName, recipeName),
        eq(popularRecipesDaily.yearMonth, yearMonth)
      ))
      
      console.log('📊 통계 쿼리 결과:', stats)
      
      const result = stats[0]
      const recent_count = result.recent_count || 0
      const old_count = result.old_count || 0
      const weighted_score = recent_count * 5 + old_count * 1
      
      console.log('📊 계산된 통계:', { recent_count, old_count, weighted_score })
      
      // 나머지 UPSERT 코드는 그대로...
      console.log('💾 Summary 테이블 UPSERT 실행 중...')
      await db
        .insert(popularRecipesSummary)
        .values({
          recipeName,
          yearMonth,
          recentCount: recent_count,
          oldCount: old_count,
          weightedScore: weighted_score,
          lastUpdated: sql`CURRENT_DATE`,
        })
        .onConflictDoUpdate({
          target: [popularRecipesSummary.recipeName, popularRecipesSummary.yearMonth],
          set: {
            recentCount: recent_count,
            oldCount: old_count,
            weightedScore: weighted_score,
            lastUpdated: sql`CURRENT_DATE`,
            updatedAt: sql`NOW()`,
          },
        })
        
      console.log('✅ Summary 테이블 UPSERT 완료')
      
    } catch (error) {
      console.error('❌ updateSummaryTable 에러:', error)
      throw error
    }
  }

// 인기 레시피 TOP 6 조회 (캐싱 적용)
export const getPopularRecipes = unstable_cache(
  async () => {
    const yearMonth = getCurrentYearMonth()
    
    try {
      const popularRecipes = await db
        .select({
          recipeName: popularRecipesSummary.recipeName,
          weightedScore: popularRecipesSummary.weightedScore,
          recentCount: popularRecipesSummary.recentCount,
          oldCount: popularRecipesSummary.oldCount,
        })
        .from(popularRecipesSummary)
        .where(eq(popularRecipesSummary.yearMonth, yearMonth))
        .orderBy(desc(popularRecipesSummary.weightedScore))
        .limit(6) // 6개 키워드

      return { success: true, recipes: popularRecipes }
    } catch (error) {
      console.error("Error fetching popular recipes:", error)
      return { success: false, recipes: [], error: "인기 레시피를 불러오는데 실패했습니다." }
    }
  },
  ['popular-recipes'],
  {
    revalidate: 3600, // 1시간마다 캐시 갱신
    tags: ['popular-recipes'],
  }
)