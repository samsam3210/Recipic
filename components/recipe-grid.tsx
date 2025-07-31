import { RecipeCard } from "@/components/recipe-card"

interface RecipeGridProps {
  recipes: {
    id: string
    recipeName: string | null
    videoThumbnail: string | null
    channelName: string | null
    summary: string | null
    difficulty: string | null
    cookingTimeMinutes: number | null
  }[]
  onDelete: (id: string, name: string | null) => void // onDelete prop 추가
  onMove: (id: string, name: string | null) => void // onMove prop 추가
  folders: { id: string; name: string }[] // 폴더 목록 추가
  currentFolderId: string | null // 현재 폴더 ID 추가
}

export function RecipeGrid({ recipes, onDelete, onMove, folders, currentFolderId }: RecipeGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          id={recipe.id}
          recipeName={recipe.recipeName}
          videoThumbnail={recipe.videoThumbnail}
          channelName={recipe.channelName}
          summary={recipe.summary}
          difficulty={recipe.difficulty}
          cookingTimeMinutes={recipe.cookingTimeMinutes}
          onDelete={onDelete} // onDelete prop 전달
          onMove={onMove} // onMove prop 전달
          folders={folders} // 폴더 목록 전달
          currentFolderId={currentFolderId} // 현재 폴더 ID 전달
        />
      ))}
    </div>
  )
}
