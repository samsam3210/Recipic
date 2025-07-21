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
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { LoadingOverlay } from "./loading-overlay"
import { ConsentModal } from "./consent-modal"
import type { UserProfile } from "@/lib/actions/user"
import { Skeleton } from "@/components/ui/skeleton"

interface NavItem {
  title: string
  href: string
}

interface HeaderProps {
  user: User | null
  userProfile: UserProfile | null
  navItems?: NavItem[] // Add navItems prop
  hideAuthButton?: boolean
}

export function Header({ user, userProfile, navItems, hideAuthButton = false }: HeaderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)

  const displayName = userProfile?.nickname || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "사용자"
  const displayAvatarUrl = userProfile?.avatarUrl || user?.user_metadata?.avatar_url

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

  const handleSignInClick = () => {
    setShowConsentModal(true)
  }

  const isValidHttpUrl = (str: string | undefined | null) => {
    if (!str) return false
    try {
      const url = new URL(str)
      return url.protocol === "http:" || url.protocol === "https:"
    } catch (_) {
      return false
    }
  }

  const avatarSrc = isValidHttpUrl(displayAvatarUrl) ? displayAvatarUrl : "/placeholder.svg"

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center py-4 px-6 md:px-8 relative">
          {" "}
          <div className="flex items-center space-x-4 flex-1">
            {" "}
            <Link href={user ? "/dashboard" : "/"} className="text-2xl font-bold tracking-tight">
              Recipick
            </Link>
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              {navItems?.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-primary">
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center space-x-2 absolute right-6 md:right-8">
            {" "}
            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={avatarSrc || "/placeholder.svg"} alt={displayName} />
                        <AvatarFallback>
                          <UserIcon className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start p-0 h-auto">
                        로그아웃
                      </Button>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : hideAuthButton ? ( // hideAuthButton이 true일 경우 스켈레톤 표시
              <Skeleton className="h-8 w-8 rounded-full" />
            ) : (
              // hideAuthButton이 false일 경우 로그인 버튼 표시
              <Button
                onClick={handleSignInClick}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isAuthLoading}
              >
                Google로 시작하기
              </Button>
            )}
          </div>
        </div>
      </header>
      <LoadingOverlay isLoading={isAuthLoading} />
      <ConsentModal isOpen={showConsentModal} onClose={() => setShowConsentModal(false)} />
    </>
  )
}
