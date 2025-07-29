import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json()
    
    // Vercel 로그에 상세하게 기록
    console.error('========================================')
    console.error('CLIENT ERROR LOG - ' + errorData.timestamp)
    console.error('========================================')
    console.error('Error Message:', errorData.errorMessage)
    console.error('Error Stack:', errorData.errorStack)
    console.error('----------------------------------------')
    console.error('URL Info:')
    console.error('  Current:', errorData.currentUrl)
    console.error('  Previous:', errorData.previousUrl)
    console.error('----------------------------------------')
    console.error('Device Info:')
    console.error('  Mobile:', errorData.isMobile)
    console.error('  Platform:', errorData.platform)
    console.error('  Screen:', errorData.screenSize)
    console.error('  Online:', errorData.online)
    console.error('----------------------------------------')
    console.error('State Info:')
    console.error('  Ready State:', errorData.readyState)
    console.error('  Visibility:', errorData.visibilityState)
    console.error('  Retry Count:', errorData.retryCount)
    console.error('----------------------------------------')
    console.error('Error Type:')
    console.error('  Hydration Error:', errorData.isHydrationError)
    console.error('  Chunk Error:', errorData.isChunkError)
    console.error('----------------------------------------')
    if (errorData.memory) {
      console.error('Memory Info:')
      console.error('  Used:', Math.round(errorData.memory.usedJSHeapSize / 1048576) + 'MB')
      console.error('  Total:', Math.round(errorData.memory.totalJSHeapSize / 1048576) + 'MB')
    }
    console.error('========================================')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error logging failed:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}