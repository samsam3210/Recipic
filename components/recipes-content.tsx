"use client"

import { Suspense, useState, useEffect } from "react"
import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { BottomNavigation } from "@/components/bottom-navigation"
import { FolderListSkeleton } from "@/components/folder-list-skeleton"
import { RecipeCardSkeleton } from "@/components/recipe-card-skeleton"
import { FolderList } from "@/components/folder-list"
import RecipeGridWrapper from "@/components/recipe-grid-wrapper"
import { CurrentFolderTitle } from "@/components/current-folder-title"
import { myRecipesSidebarNavItems } from "@/lib/navigation"
import { MobileFolderSelector } from "@/components/mobile-folder-selector"
import { useRecipesCache } from "@/components/cached-recipes"

export function RecipesContent({ userId, selectedFolderId, page, limit, initialRecipesData, forceInitialSkeleton = false }: { 
  userId: string, 
  selectedFolderId: string | null, 
  page: number, 
  limit: number,
  initialRecipesData?: any,
  forceInitialSkeleton?: boolean
}) {
  const { folders: cachedFolders, userProfile: cachedUserProfile, isLoading } = useRecipesCache()
  
  // 강제 초기 스켈레톤 표시
  const [showInitialSkeleton, setShowInitialSkeleton] = useState(forceInitialSkeleton)
  
  useEffect(() => {
    if (forceInitialSkeleton) {
      const timer = setTimeout(() => {
        setShowInitialSkeleton(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [forceInitialSkeleton])
  
  // 실제 로딩 상태: 강제 스켈레톤이 있으면 우선, 없으면 기존 로딩 상태
  const actualIsLoading = showInitialSkeleton || isLoading
  
  console.log('[RecipesContent] 렌더링:', {
    timestamp: new Date().toISOString(),
    userId,
    isLoading,
    actualIsLoading,
    showInitialSkeleton,
    foldersLength: cachedFolders?.length || 0,
    hasUserProfile: !!cachedUserProfile,
    hasInitialRecipesData: !!initialRecipesData
  })
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 - 네비게이션 메뉴 없음 */}
      <Header />
      
      <main className="flex-1 pt-6 md:pt-8 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 pb-20 lg:pb-8">
        {/* 왼쪽 사이드바 (데스크톱만) */}
        <aside className="hidden lg:block lg:w-1/5 lg:min-w-[200px] lg:border-r lg:pr-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">메뉴</h2>
          <SidebarNav items={myRecipesSidebarNavItems} className="mb-8" />
          {isLoading ? (
            <FolderListSkeleton />
          ) : (
            <FolderList folders={cachedFolders} selectedFolderId={selectedFolderId} />
          )}
        </aside>

        <section className="flex-1 lg:w-4/5 space-y-10 min-h-screen">
          {actualIsLoading ? (
            <div className="space-y-10">
              {/* 모바일 폴더 선택기 스켈레톤 */}
              <div className="lg:hidden">
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
              </div>
              
              {/* 현재 폴더 제목 스켈레톤 */}
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
              
              {/* 레시피 그리드 스켈레톤 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: limit }).map((_, i) => (
                  <RecipeCardSkeleton key={i} />
                ))}
              </div>
            </div>
          ) : (
            <>
              <MobileFolderSelector folders={cachedFolders} selectedFolderId={selectedFolderId} />
              
              <CurrentFolderTitle folders={cachedFolders} />

              <RecipeGridWrapper
                userId={userId}
                initialSelectedFolderId={selectedFolderId}
                initialPage={page}
                initialLimit={limit}
                initialFolders={cachedFolders}
                initialRecipesData={initialRecipesData}
              />
            </>
          )}
            </section>
          </div>
        </div>
      </main>
      
      {/* 하단 네비게이션 (모바일만) */}
      <BottomNavigation />
      
      <footer className="hidden lg:block border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>
    </div>
  )
}