"use client"

import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { BottomNavigation } from "@/components/bottom-navigation"
import { myRecipesSidebarNavItems } from "@/lib/navigation"

// 빠른 로딩 화면 - 스켈레톤 없이 기본 레이아웃만
export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-1 flex flex-col lg:flex-row py-8 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full gap-8 pb-20 lg:pb-8">
        <aside className="hidden lg:block lg:w-1/5 lg:min-w-[200px] lg:border-r lg:pr-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">메뉴</h2>
          <SidebarNav items={myRecipesSidebarNavItems} className="mb-8" />
        </aside>
        
        <section className="flex-1 lg:w-4/5 space-y-10">
          {/* 모바일 폴더 선택기 스켈레톤 */}
          <div className="lg:hidden">
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
          </div>
          
          {/* 현재 폴더 제목 스켈레톤 */}
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          
          {/* 레시피 그리드 스켈레톤 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border rounded-lg overflow-hidden shadow-sm animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      
      <BottomNavigation />
      
      <footer className="hidden lg:block border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>
    </div>
  )
}