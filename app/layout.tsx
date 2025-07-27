import type { Metadata } from 'next'
import './globals.css'
import { UserProvider } from "@/contexts/user-context"
import { ExtractionProvider } from "@/contexts/extraction-context"
import { FloatingExtractionBar } from "@/components/floating-extraction-bar"
import { Toaster } from "@/components/ui/toaster"
import { QueryProvider } from "@/providers/query-provider"

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
        <QueryProvider>
          <UserProvider>
            <ExtractionProvider>
              <Toaster />
              {children}
              <FloatingExtractionBar />
            </ExtractionProvider>
          </UserProvider>
        </QueryProvider>
      </body>
    </html>
  )
}