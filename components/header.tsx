"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
import { UserIcon, Menu, X } from "lucide-react"
import { signOut } from "@/lib/actions/auth"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { LoadingOverlay } from "./loading-overlay"
import { ConsentModal } from "./consent-modal"
import type { UserProfile } from "@/lib/actions/user"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  href: string
}

interface HeaderProps {
  user: User | null
  userProfile: UserProfile | null
  navItems?: NavItem[]
  hideAuthButton?: boolean
}

export function Header({ user, userProfile, navItems, hideAuthButton = false }: HeaderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const pathname = usePathname()
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          {/* 로고 */}
          <div className="mr-6 flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">R</span>
              </div>
              <span className="font-bold text-xl">Recipick</span>
            </Link>
          </div>

          {/* 데스크톱 네비게이션 (1024px 이상) */}
          {navItems && navItems.length > 0 && (
            <nav className="hidden lg:flex items-center space-x-6 text-sm font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "transition-colors hover:text-foreground/80",
                    pathname === item.href ? "text-foreground" : "text-foreground/60"
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          )}

          {/* 우측 영역 */}
          <div className="ml-auto flex items-center space-x-4">
            {/* 모바일 메뉴 버튼 (1024px 미만) */}
            {navItems && navItems.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            )}

            {/* 인증 버튼 영역 */}
            {!hideAuthButton && (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={displayAvatarUrl} alt={displayName} />
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
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} disabled={isAuthLoading}>
                        {isAuthLoading ? "로그아웃 중..." : "로그아웃"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button onClick={handleSignIn} size="sm">
                    로그인
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* 모바일 네비게이션 메뉴 (1024px 미만) */}
        {navItems && navItems.length > 0 && isMobileMenuOpen && (
          <div className="lg:hidden">
            <div className="border-t bg-background p-4">
              <nav className="flex flex-col space-y-3">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-foreground",
                      pathname === item.href ? "text-foreground" : "text-foreground/70"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.title}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}
      </header>
    </>
  )
}