"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Trash2, Folder, Clock, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RecipeCardProps {
  id: string
  recipeName: string | null
  videoThumbnail: string | null
  channelName: string | null
  summary: string | null
  difficulty: string | null
  cookingTimeMinutes: number | null
  onDelete: (id: string, name: string | null) => void
  onMove: (id: string, name: string | null) => void
  folders: { id: string; name: string }[] // 폴더 목록 추가
  currentFolderId: string | null // 현재 레시피가 속한 폴더 ID (선택 사항)
}

export function RecipeCard({
  id,
  recipeName,
  videoThumbnail,
  channelName,
  summary,
  difficulty,
  cookingTimeMinutes,
  onDelete,
  onMove,
  folders,
  currentFolderId,
}: RecipeCardProps) {
  console.log('[RecipeCard] 렌더링:', { 
    id, 
    recipeName, 
    hasVideoThumbnail: !!videoThumbnail,
    timestamp: new Date().toISOString()
  })
  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200 relative">
      <Link href={`/recipe/${id}`} className="block h-full">
        <CardHeader className="p-0">
          <AspectRatio ratio={16 / 9}>
            <Image
              src={videoThumbnail || "/placeholder.svg?height=200&width=300&text=No+Thumbnail"}
              alt={recipeName || "레시피 썸네일"}
              fill
              className="rounded-t-lg object-cover"
            />
          </AspectRatio>
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col">
          <CardTitle className="text-lg font-semibold line-clamp-2 mb-2">{recipeName || "제목 없음"}</CardTitle>
          {channelName && (
            <CardDescription className="text-sm text-muted-foreground mb-2">{channelName}</CardDescription>
          )}
          
          {/* 난이도와 조리시간 */}
          <div className="flex items-center gap-3 text-sm text-gray-400 mb-2">
            {cookingTimeMinutes ? (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{cookingTimeMinutes}분</span>
              </div>
            ) : <div></div>}
            {difficulty ? (
              <div className="flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                <span>{difficulty}</span>
              </div>
            ) : <div></div>}
          </div>
          
          {summary && <p className="text-sm text-muted-foreground line-clamp-2">{summary}</p>}
        </CardContent>
      </Link>

      {/* 액션 버튼 드롭다운 */}
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/80 hover:bg-white">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">레시피 옵션</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/recipe/${id}`}>
                <span className="flex items-center">
                  <Folder className="mr-2 h-4 w-4" /> 레시피 보기
                </span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onMove(id, recipeName)}>
              <span className="flex items-center">
                <Folder className="mr-2 h-4 w-4" /> 폴더로 이동
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(id, recipeName)}
              className="text-destructive focus:text-destructive"
            >
              <span className="flex items-center">
                <Trash2 className="mr-2 h-4 w-4" /> 삭제
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )
}
