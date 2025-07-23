import { Header } from "@/components/header"
import { SidebarNav } from "@/components/sidebar-nav"
import { Skeleton } from "@/components/ui/skeleton"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Card } from "@/components/ui/card"
import { dashboardSidebarNavItems } from "@/lib/navigation"

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header user={null} userProfile={null} hideAuthButton={true} />
      <main className="flex-1 flex flex-col lg:flex-row py-8 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full gap-8">
        <aside className="lg:w-1/5 lg:min-w-[200px] lg:border-r lg:pr-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 hidden lg:block">메뉴</h2>
          <SidebarNav items={dashboardSidebarNavItems} />
        </aside>

        <section className="flex-1 lg:w-4/5 space-y-10">
          {/* 인사말 및 캐치프레이즈 스켈레톤 */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-8 w-80" />
          </div>

          {/* HeroSection (YouTube URL 입력) 스켈레톤 */}
          <div className="w-full space-y-4">
            <div className="relative flex items-center w-full max-w-xl mx-auto rounded-full shadow-input-unit-shadow overflow-hidden">
              <Skeleton className="h-12 flex-grow rounded-full" />
            </div>
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>

          {/* 최근 조회한 레시피 스켈레톤 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow duration-200">
                  <div className="flex flex-col md:flex-row p-4">
                    <div className="w-full md:w-48 md:h-32 flex-shrink-0 md:mr-4 mb-4 md:mb-0">
                      <AspectRatio ratio={16 / 9}>
                        <Skeleton className="h-full w-full rounded-md" />
                      </AspectRatio>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/2 mb-1" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>
    </div>
  )
}