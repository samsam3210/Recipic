"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, BookOpen, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavigationProps {
  className?: string
}

export function BottomNavigation({ className }: BottomNavigationProps) {
  const pathname = usePathname()

  const navItems = [
    {
      href: "/dashboard",
      label: "홈",
      icon: Home,
    },
    {
      href: "/search",
      label: "검색",
      icon: Search,
    },
    {
      href: "/recipes",
      label: "나의레시피",
      icon: BookOpen,
    },
    {
      href: "/settings",
      label: "마이페이지",
      icon: User,
    },
  ]

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden",
      className
    )}>
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                console.log('[BottomNavigation] 탭 클릭:', {
                  timestamp: new Date().toISOString(),
                  from: pathname,
                  to: item.href,
                  label: item.label
                })
              }}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full space-y-1 text-xs transition-colors",
                isActive 
                  ? "text-orange-400 font-medium" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className={cn(
                "h-5 w-5",
                isActive ? "text-orange-400" : "text-gray-500"
              )} />
              <span className={cn(
                "text-xs",
                isActive ? "text-orange-400 font-medium" : "text-gray-500"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}