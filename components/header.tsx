"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserIcon } from "lucide-react"
import { signOut } from "@/lib/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { LoadingOverlay } from "./loading-overlay"
import { ConsentModal } from "./consent-modal"
import { useUser } from "@/contexts/user-context"

interface HeaderProps {
  hideAuthButton?: boolean
}

export function Header({ hideAuthButton = false }: HeaderProps) {
  const { user, userProfile, isLoading } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)

  const displayName = userProfile?.nickname || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "사용자"
  const displayAvatarUrl = userProfile?.avatarUrl || user?.user_metadata?.avatar_url

  // 로딩 중일 때는 스켈레톤 표시
  if (isLoading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 hidden lg:block">
        <div className="container flex h-16 items-center">
          <div className="mr-6 flex items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-gray-900">Recipick</span>
            </div>
          </div>
          <div className="ml-auto flex items-center">
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>
      </header>
    )
  }

  const handleSignOut = async () => {
    setIsAuthLoading(true)
    toast({
      title: "로그아웃 처리 중...",
      description: "잠시만 기다려 주세요.",
      duration: 2000,
    })

    try {
      const serverSignOutResult = await signOut()

      if (serverSignOutResult.success) {
        const { error: clientSignOutError } = await supabase.auth.signOut()

        if (clientSignOutError) {
          console.error("[Header handleSignOut] Client-side signOut failed:", clientSignOutError.message)
          toast({
            title: "로그아웃 실패",
            description: clientSignOutError.message || "클라이언트 로그아웃 중 오류가 발생했습니다.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "로그아웃 완료",
            description: serverSignOutResult.message,
          })
          router.push("/")
        }
      } else {
        console.error("[Header handleSignOut] Server signOut failed:", serverSignOutResult.message)
        toast({
          title: "로그아웃 실패",
          description: serverSignOutResult.message,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("[Header handleSignOut] Unexpected error during logout:", error)
      toast({
        title: "오류 발생",
        description: error.message || "로그아웃 중 알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleSignIn = () => {
    setShowConsentModal(true)
  }

  return (
    <>
      {/* Loading Overlay */}
      {isAuthLoading && (
        <LoadingOverlay
          isVisible={isAuthLoading}
          currentStep={1}
          steps={["로그아웃 처리 중..."]}
        />
      )}

      {/* Consent Modal */}
      {showConsentModal && (
        <ConsentModal
          isOpen={showConsentModal}
          onClose={() => setShowConsentModal(false)}
        />
      )}

      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 hidden lg:block">
        <div className="container flex h-16 items-center">
          {/* 로고 */}
          <div className="mr-6 flex items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-gray-900">Recipick</span>
            </div>
          </div>

          {/* 우측 영역 - 비로그인 사용자만 로그인 버튼 */}
          <div className="ml-auto flex items-center">
            {!hideAuthButton && !user && (
              <Button onClick={handleSignIn} size="sm">
                로그인
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  )
}