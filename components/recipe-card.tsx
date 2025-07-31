"use client"

import Link from "next/link"
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
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 border border-gray-100 p-4 relative">
      <Link href={`/recipe/${id}`} className="block">
        {/* 썸네일 - 상단 전체 너비 */}
        <div className="relative w-full mb-3">
          <div className="relative w-full aspect-video rounded-xl overflow-hidden">
            <Image
              src={videoThumbnail || "/placeholder.svg?height=200&width=300&text=No+Thumbnail"}
              alt={recipeName || "레시피 썸네일"}
              fill
              className="object-cover"
            />
          </div>
        </div>
        
        {/* 콘텐츠 정보 */}
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
            {recipeName || "제목 없음"}
          </h3>
          
          {channelName && (
            <p className="text-sm text-gray-500 truncate">{channelName}</p>
          )}
          
          {/* 난이도와 조리시간 */}
          <div className="flex items-center gap-3 text-sm text-gray-400">
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
          
          {summary && (
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
              {summary}
            </p>
          )}
        </div>
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
    </div>
  )
}
