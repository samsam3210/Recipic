// lib/navigation.ts
export interface NavItem {
    title: string
    href: string
  }
  
  // 메인 헤더 네비게이션 아이템들 (검색 포함)
  export const mainNavItems: NavItem[] = [
    {
      title: "홈",
      href: "/dashboard",
    },
    {
      title: "검색",
      href: "/search",
    },
    {
      title: "나의레시피",
      href: "/recipes",
    },
    {
      title: "마이페이지",
      href: "/settings",
    },
  ]
  
  // 대시보드 사이드바 네비게이션
  export const dashboardSidebarNavItems: NavItem[] = [
    {
      title: "홈",
      href: "/dashboard",
    },
    {
      title: "검색",
      href: "/search",
    },
    {
      title: "나의레시피",
      href: "/recipes",
    },
    {
      title: "마이페이지",
      href: "/settings",
    },
  ]
  
  // 레시피 페이지 사이드바 네비게이션
  export const myRecipesSidebarNavItems: NavItem[] = [
    {
      title: "홈",
      href: "/dashboard",
    },
    {
      title: "검색",
      href: "/search",
    },
    {
      title: "나의레시피",
      href: "/recipes",
    },
    {
      title: "마이페이지",
      href: "/settings",
    },
  ]
  
  // 설정 페이지용 사이드바 (기존 유지)
  export const settingsSidebarNavItems: NavItem[] = [
    {
      title: "프로필",
      href: "/settings",
    },
  ]