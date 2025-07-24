export default function SettingsLoading() {
    return (
      <div className="flex flex-col min-h-screen">
        {/* 헤더 스켈레톤 */}
        <div className="border-b bg-background">
          <div className="container flex h-16 items-center">
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="ml-auto h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>
        
        <main className="flex-1 flex flex-col lg:flex-row py-8 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full gap-8 pb-20 lg:pb-8">
          {/* 사이드바 스켈레톤 (데스크톱만) */}
          <aside className="hidden lg:block lg:w-1/5 lg:min-w-[200px] lg:border-r lg:pr-8">
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-6"></div>
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </aside>
  
          {/* 메인 콘텐츠 스켈레톤 */}
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
        
        {/* 하단 네비게이션 스켈레톤 */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t bg-background">
          <div className="flex justify-around py-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col items-center py-1">
                <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-8 bg-gray-200 rounded animate-pulse mt-1"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }