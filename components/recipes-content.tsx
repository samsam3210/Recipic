"use client"

import { Suspense } from "react"
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

export function RecipesContent({ userId, selectedFolderId, page, limit }: { 
  userId: string, 
  selectedFolderId: string | null, 
  page: number, 
  limit: number 
}) {
  const { folders: cachedFolders, userProfile: cachedUserProfile, isLoading } = useRecipesCache()
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 - 네비게이션 메뉴 없음 */}
      <Header />
      
      <main className="flex-1 flex flex-col lg:flex-row py-8 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full gap-8 pb-20 lg:pb-8">
        {/* 왼쪽 사이드바 (데스크톱만) */}
        <aside className="hidden lg:block lg:w-1/5 lg:min-w-[200px] lg:border-r lg:pr-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">메뉴</h2>
          <SidebarNav items={myRecipesSidebarNavItems} className="mb-8" />
          <Suspense fallback={<FolderListSkeleton />}>
            <FolderList folders={cachedFolders} selectedFolderId={selectedFolderId} />
          </Suspense>
        </aside>

        <section className="flex-1 lg:w-4/5 space-y-10">
          <MobileFolderSelector folders={cachedFolders} selectedFolderId={selectedFolderId} />
          
          <CurrentFolderTitle folders={cachedFolders} />

          <RecipeGridWrapper
            userId={userId}
            initialSelectedFolderId={selectedFolderId}
            initialPage={page}
            initialLimit={limit}
            initialFolders={cachedFolders}
          />
        </section>
      </main>
      
      {/* 하단 네비게이션 (모바일만) */}
      <BottomNavigation />
      
      <footer className="hidden lg:block border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>
    </div>
  )
}