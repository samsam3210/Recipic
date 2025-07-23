import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateUserProfile } from '@/lib/actions/user'
import { Header } from '@/components/header'
import { BottomNavigation } from '@/components/bottom-navigation'
import SearchForm from '@/components/search-form'
import SearchResults from '@/components/search-results'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'YouTube 레시피 검색 | Recipick',
  description: '키워드로 YouTube 요리 영상을 검색하고 레시피를 추출하세요.',
}

interface SearchPageProps {
  searchParams: {
    q?: string
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || ''
  
  // 사용자 정보 가져오기
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let userProfile = null
  if (user) {
    userProfile = await getOrCreateUserProfile(user)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      <Header user={user} userProfile={userProfile} />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 헤더 영역 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            YouTube 레시피 검색
          </h1>
          <p className="text-gray-600">
            요리 이름이나 재료를 검색해서 레시피를 찾아보세요
          </p>
        </div>

        {/* 검색 폼 */}
        <div className="mb-8">
          <SearchForm initialQuery={query} />
        </div>

        {/* 검색 결과 */}
        {query && (
          <Suspense fallback={<div className="text-center py-8">검색 중...</div>}>
            <SearchResults query={query} />
          </Suspense>
        )}

        {/* 검색 전 안내 */}
        {!query && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                레시피를 검색해보세요
              </h3>
              <p className="text-gray-500 text-sm">
                예: "김치찌개", "파스타 만들기", "디저트 레시피"
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* 하단 네비게이션 (모바일만) */}
      <BottomNavigation />
      
      <footer className="hidden lg:block border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>
    </div>
  )
}