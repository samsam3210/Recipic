import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { BottomNavigation } from "@/components/bottom-navigation"
import { settingsSidebarNavItems, settingsSubNavItems } from "@/lib/navigation"

export default function SettingsLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 - 스켈레톤 없이 실제 헤더 컴포넌트 사용 */}
      <Header user={null} userProfile={null} hideAuthButton={true} />
      
      <main className="flex-1 flex flex-col lg:flex-row py-8 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full gap-8 pb-20 lg:pb-8">
        {/* 사이드바 - 스켈레톤 없이 실제 사이드바 컴포넌트 사용 */}
        <aside className="hidden lg:block lg:w-1/5 lg:min-w-[200px] lg:border-r lg:pr-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">메뉴</h2>
          <SidebarNav items={settingsSidebarNavItems} className="mb-8" />
          
          <h3 className="text-lg font-semibold text-gray-900 mb-4">설정</h3>
          <SidebarNav items={settingsSubNavItems} />
        </aside>

        {/* 메인 콘텐츠만 스켈레톤 적용 */}
        <section className="flex-1 lg:w-4/5 space-y-6">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="space-y-4">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
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