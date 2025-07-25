import { NextResponse } from "next/server"
import { getKeyStatistics, resetFailedKeys } from "@/lib/utils/api-key-rotation"

/**
 * API 키 상태 조회 및 관리 엔드포인트 (관리자용)
 */
export async function GET() {
  try {
    const statistics = getKeyStatistics()
    
    return NextResponse.json({
      status: "success",
      data: statistics,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to get API key statistics: ${(error as Error).message}` },
      { status: 500 }
    )
  }
}

/**
 * 실패한 API 키 목록 리셋 (관리자용)
 */
export async function POST(req: Request) {
  try {
    const { action, type } = await req.json()
    
    if (action === 'reset_failed_keys') {
      resetFailedKeys(type as 'youtube' | 'gemini' | undefined)
      
      return NextResponse.json({
        status: "success",
        message: `Failed keys reset for ${type || 'all services'}`,
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json(
      { error: "Invalid action. Use 'reset_failed_keys'" },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to reset failed keys: ${(error as Error).message}` },
      { status: 500 }
    )
  }
}