import Link from "next/link"
import Image from "next/image"
import { Clock, BarChart3, Bookmark } from "lucide-react"

interface RecipeListItemProps {
  id: string
  recipeName: string | null
  videoThumbnail: string | null
  channelName: string | null
  summary: string | null
  cookingTimeMinutes?: number | null
  difficulty?: string | null
}

export function DashboardRecentRecipes({ recipes }: { recipes: RecipeListItemProps[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      {recipes.map((recipe) => (
        <div key={recipe.id} className="flex-none w-56">
          <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200">
            <div className="relative" style={{ paddingBottom: '56.25%' }}>
              <Image
                src={recipe.videoThumbnail || "/placeholder.svg?height=192&width=256&text=No+Thumbnail"}
                alt={recipe.recipeName || "레시피 썸네일"}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">
                  {recipe.recipeName || "제목 없음"}
                </h3>
                <Bookmark className="w-4 h-4 text-gray-400 flex-none ml-2" />
              </div>
              {recipe.channelName && (
                <p className="text-xs text-gray-500 mb-2">{recipe.channelName}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                {recipe.cookingTimeMinutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{recipe.cookingTimeMinutes}분</span>
                  </div>
                )}
                {recipe.difficulty && (
                  <div className="flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    <span>{recipe.difficulty}</span>
                  </div>
                )}
              </div>
              {recipe.summary && (
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                  {recipe.summary}
                </p>
              )}
              <Link
                href={`/recipe/${recipe.id}`}
                className="block w-full text-center py-2.5 mt-2.5 text-white text-sm font-medium rounded-full transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(120deg, #FF9057 0%, #FF5722 100%)',
                  boxShadow: '0 3px 12px rgba(255, 87, 34, 0.3)'
                }}
              >
                레시피 보기
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
