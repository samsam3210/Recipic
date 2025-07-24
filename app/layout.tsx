import type { Metadata } from 'next'
import './globals.css'
import { UserProvider } from "@/contexts/user-context"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'Recipick',
  description: 'YouTube 레시피를 AI로 추출하는 서비스',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body>
        <UserProvider>
          <Toaster />
          {children}
        </UserProvider>
      </body>
    </html>
  )
}