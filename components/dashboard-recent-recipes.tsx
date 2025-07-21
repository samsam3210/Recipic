import Link from "next/link"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { AspectRatio } from "@/components/ui/aspect-ratio"

interface RecipeListItemProps {
  id: string
  recipeName: string | null
  videoThumbnail: string | null
  channelName: string | null
  summary: string | null
}

export function DashboardRecentRecipes({ recipes }: { recipes: RecipeListItemProps[] }) {
  return (
    <div className="space-y-4">
      {recipes.map((recipe) => (
        <Link key={recipe.id} href={`/recipe/${recipe.id}`} className="block">
          <Card className="hover:shadow-md transition-shadow duration-200">
            <div className="flex flex-col md:flex-row p-4">
              <div className="w-full md:w-48 md:h-32 flex-shrink-0 md:mr-4 mb-4 md:mb-0">
                <AspectRatio ratio={16 / 9}>
                  <Image
                    src={recipe.videoThumbnail || "/placeholder.svg?height=192&width=256&text=No+Thumbnail"}
                    alt={recipe.recipeName || "레시피 썸네일"}
                    fill
                    className="rounded-md object-cover"
                  />
                </AspectRatio>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base line-clamp-1 mb-1">{recipe.recipeName || "제목 없음"}</h3>
                {recipe.channelName && (
                  <p className="text-sm text-muted-foreground line-clamp-1 mb-1">{recipe.channelName}</p>
                )}
                {recipe.summary && <p className="text-sm text-muted-foreground line-clamp-2">{recipe.summary}</p>}
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
