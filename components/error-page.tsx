"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function ErrorPage() {
  const handleRetryLogin = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              레시픽
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              잠시 연결이 원활하지 않아요
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-gray-600">
            네트워크 연결을 확인하고 다시 시도해주세요.
          </p>
          <Button 
            onClick={handleRetryLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            size="lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 로그인하기
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}