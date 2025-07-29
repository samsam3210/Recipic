import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { 
  profiles, 
  recipes, 
  folders, 
  recipeFolders, 
  dailyUsage,
  recentlyViewedRecipes 
} from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const userId = user.id

    // 트랜잭션으로 모든 데이터 삭제 (외래키 제약 오류 방지를 위한 올바른 순서)
    await db.transaction(async (tx) => {
      // 1. recentlyViewedRecipes 먼저 삭제
      await tx.delete(recentlyViewedRecipes).where(eq(recentlyViewedRecipes.userId, userId))
      
      // 2. recipeFolders 삭제 (recipes 삭제 전에)
      const userRecipes = await tx.select({ id: recipes.id }).from(recipes).where(eq(recipes.userId, userId))
      for (const recipe of userRecipes) {
        await tx.delete(recipeFolders).where(eq(recipeFolders.recipeId, recipe.id))
      }
      
      // 3. recipes 삭제
      await tx.delete(recipes).where(eq(recipes.userId, userId))
      
      // 4. folders 삭제
      await tx.delete(folders).where(eq(folders.userId, userId))
      
      // 5. dailyUsage 삭제
      await tx.delete(dailyUsage).where(eq(dailyUsage.userId, userId))
      
      // 6. profiles 삭제 (마지막)
      await tx.delete(profiles).where(eq(profiles.userId, userId))
    })

    // Supabase Auth에서 사용자 삭제 (admin 권한 필요)
    // 주의: admin.deleteUser는 service role key가 필요하므로 일반적으로 사용할 수 없음
    // 대신 사용자가 직접 계정을 삭제하도록 안내하거나, 
    // RLS(Row Level Security)를 통해 데이터만 삭제하고 Auth 계정은 유지
    
    try {
      // 클라이언트 세션 종료
      await supabase.auth.signOut()
    } catch (signOutError) {
      console.error('로그아웃 실패:', signOutError)
      // 로그아웃 실패해도 계속 진행 (데이터는 이미 삭제됨)
    }

    return NextResponse.json({
      success: true,
      message: '계정 데이터가 성공적으로 삭제되었습니다. 로그인 계정은 별도로 관리됩니다.'
    })

  } catch (error: any) {
    console.error('계정 삭제 중 오류:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || '계정 삭제 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}