import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { BottomNavigation } from "@/components/bottom-navigation"
import { FolderListSkeleton } from "@/components/folder-list-skeleton"
import { RecipeCardSkeleton } from "@/components/recipe-card-skeleton"
import { Skeleton } from "@/components/ui/skeleton"
import { myRecipesSidebarNavItems } from "@/lib/navigation"

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 - 스켈레톤 없이 실제 헤더 컴포넌트 사용 */}
      <Header user={null} userProfile={null} hideAuthButton={true} />
      
      <main className="flex-1 flex flex-col lg:flex-row py-8 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full gap-8 pb-20 lg:pb-8">
        {/* 사이드바 - 네비게이션은 스켈레톤 없이, 폴더 목록만 스켈레톤 적용 */}
        <aside className="hidden lg:block lg:w-1/5 lg:min-w-[200px] lg:border-r lg:pr-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">메뉴</h2>
          <SidebarNav items={myRecipesSidebarNavItems} className="mb-8" />
          <FolderListSkeleton />
        </aside>
        
        {/* 메인 콘텐츠 스켈레톤 */}
        <section className="flex-1 lg:w-4/5 space-y-10">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        </section>
      </main>
      
      {/* 하단 네비게이션 - 스켈레톤 없이 실제 컴포넌트 사용 */}
      <BottomNavigation />
      
      <footer className="hidden lg:block border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>
    </div>
  )
}