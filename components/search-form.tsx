'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchFormProps {
  initialQuery?: string
}

export default function SearchForm({ initialQuery = '' }: SearchFormProps) {
  const [query, setQuery] = useState(initialQuery)
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim()) {
      return
    }

    setIsSearching(true)
    
    // URL 파라미터로 검색어 전달
    const searchParams = new URLSearchParams()
    searchParams.set('q', query.trim())
    
    router.push(`/search?${searchParams.toString()}`)
    
    // 검색이 완료되면 로딩 상태 해제
    setTimeout(() => setIsSearching(false), 500)
  }

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto">
      <div className="relative flex items-center w-full rounded-full shadow-lg border border-gray-200 bg-white overflow-hidden focus-within:border-gray-300 focus-within:shadow-xl transition-all">
        {/* 검색 아이콘 */}
        <div className="pl-5">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        
        {/* 입력 필드 */}
        <Input
          type="text"
          placeholder="요리 이름이나 재료를 검색해보세요"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 h-14 pl-4 pr-20 text-base border-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-full rounded-r-none placeholder:text-gray-400"
          disabled={isSearching}
        />
        
        {/* 검색 버튼 */}
        <Button
          type="submit"
          disabled={!query.trim() || isSearching}
          size="icon"
          className={`absolute right-0 h-full w-14 ${
            !query.trim() || isSearching
              ? 'bg-gray-400'
              : 'bg-black hover:bg-gray-800'
          } text-white rounded-r-full rounded-l-none transition-colors duration-200`}
        >
          {isSearching ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </Button>
      </div>
      
      {/* 검색 팁 */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-500">
          💡 팁: "김치찌개 만들기", "초콜릿 케이크 레시피" 등으로 검색해보세요
        </p>
      </div>
    </form>
  )
}