// lib/navigation.ts
export interface NavItem {
    title: string
    href: string
  }
  
  // 사이드바 네비게이션 아이템들 (검색 포함)
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
  
  // 마이페이지 사이드바 네비게이션 (메인 네비 + 설정 하위 메뉴)
  export const settingsSidebarNavItems: NavItem[] = [
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
  
  // 설정 하위 메뉴
  export const settingsSubNavItems: NavItem[] = [
    {
      title: "프로필",
      href: "/settings",
    },
  ]