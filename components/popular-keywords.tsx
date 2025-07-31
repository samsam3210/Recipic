"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { getPopularRecipes } from '@/lib/actions/popular-recipes'

interface PopularKeyword {
  recipeName: string
  weightedScore: number
  recentCount: number
  oldCount: number
}

interface PopularKeywordsProps {
  onKeywordClick: (keyword: string) => void
  isSearching?: boolean
}

export function PopularKeywords({ onKeywordClick, isSearching = false }: PopularKeywordsProps) {
  const [keywords, setKeywords] = useState<PopularKeyword[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchKeywords() {
      try {
        const result = await getPopularRecipes()
        if (result.success) {
          setKeywords(result.recipes)
        }
      } catch (error) {
        console.error('Failed to fetch popular keywords:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchKeywords()
  }, [])

  if (loading) {
    return null // 로딩 중에는 아무것도 표시하지 않음
  }

  if (keywords.length === 0) {
    return null
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">인기 레시피</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {keywords.map((item, index) => (
          <Button
            key={index}
            variant="outline"
            onClick={() => onKeywordClick(item.recipeName)}
            disabled={isSearching}
            className="rounded-full border-gray-300 hover:bg-gray-50 transition-all duration-200 text-sm px-4 py-2"
          >
            <span>{item.recipeName}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}