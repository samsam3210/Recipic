import { NextResponse } from "next/server"
import { searchYouTubeVideos, getMultipleVideoDetails } from "@/lib/utils/youtube-api-wrapper"

function formatViewCount(count: number): string {
    if (count >= 100_000_000) {
      return `${(count / 100_000_000).toFixed(1).replace(/\.0$/, '')}억회`
    } else if (count >= 10_000) {
      return `${(count / 10_000).toFixed(1).replace(/\.0$/, '')}만회`
    } else if (count >= 1_000) {
      return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}천회`
    } else {
      return `${count}회`
    }
  }

function parseISODuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return ""

  const hours = parseInt(match[1] || "0", 10)
  const minutes = parseInt(match[2] || "0", 10)
  const seconds = parseInt(match[3] || "0", 10)

  const secondsPadded = seconds.toString().padStart(2, "0")
  const minutesPadded = minutes.toString().padStart(2, "0")

  if (hours > 0) {
    return `${hours}:${minutesPadded}:${secondsPadded}`
  }
  return `${minutes}:${secondsPadded}`
}

function getDurationInSeconds(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0

  const hours = parseInt(match[1] || "0", 10)
  const minutes = parseInt(match[2] || "0", 10)
  const seconds = parseInt(match[3] || "0", 10)

  return hours * 3600 + minutes * 60 + seconds
}

export async function POST(req: Request) {
  const { query } = await req.json()
  const maxResults = 20

  if (!query) {
    return NextResponse.json({ error: "검색 키워드가 필요합니다." }, { status: 400 })
  }

  try {
    // --- 1. 카테고리 필터 없이 단일 검색 요청 ---
    const searchData = await searchYouTubeVideos(`${query} 요리 레시피`, 50, {
      type: "video",
      order: "relevance"
    })

    if (!searchData.items || searchData.items.length === 0) {
      return NextResponse.json({
        results: [],
        message: "검색 결과가 없습니다. 다른 키워드로 시도해보세요.",
      })
    }

    // --- 2. videoId 추출 후 상세 정보 요청 ---
    const videoIds = searchData.items.map((item: any) => item.id.videoId)
    const videosData = await getMultipleVideoDetails(videoIds)

    // --- 3. 조회수 및 영상 길이 필터링 + 포맷팅 ---
    const results = videosData.items
      .filter((video: any) => {
        // 기존 필터링 유지
        const viewCount = parseInt(video.statistics.viewCount, 10)
        const durationInSeconds = getDurationInSeconds(video.contentDetails.duration)
        if (viewCount < 1000 || durationInSeconds < 60) return false
        
        const title = video.snippet.title.toLowerCase()
        
        // 1. 브이로그는 무조건 제외
        const vlogKeywords = ['vlog', 'v-log', '브이로그', '일상']
        if (vlogKeywords.some(keyword => title.includes(keyword))) {
          return false
        }
        
        // 2. 다른 의심 키워드들
        const suspectKeywords = ['먹방', 'mukbang', '리뷰', '맛집']
        const hasSuspectKeyword = suspectKeywords.some(keyword => title.includes(keyword))
        
        // 3. 레시피 관련 긍정 키워드 (확장된 목록)
        const recipeKeywords = [
          '레시피', '조리법', '만들기', '만드는법', '요리법',
          '재료', '황금레시피', '비법', '꿀팁', '초간단',
          '집밥', '백종원', '김수미', '손질법', '양념',
          'recipe', 'how to', 'cooking', 'tutorial',
          '쉬운', '간단'
        ]
        const hasRecipeKeyword = recipeKeywords.some(keyword => title.includes(keyword))
        
        // 의심 키워드가 있어도 레시피 키워드가 있으면 통과
        if (hasSuspectKeyword && !hasRecipeKeyword) {
          return false
        }
        
        return true
      })
      .map((video: any) => {
        const viewCountNum = parseInt(video.statistics.viewCount, 10)
        return {
          videoId: video.id,
          title: video.snippet.title,
          channelName: video.snippet.channelTitle,
          thumbnail:
            video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
          description: video.snippet.description,
          viewCount: viewCountNum,
          viewCountFormatted: formatViewCount(viewCountNum),
          duration: video.contentDetails.duration,
          durationFormatted: parseISODuration(video.contentDetails.duration),
          publishedAt: video.snippet.publishedAt,
          youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
        }
      })
      .slice(0, maxResults)

    return NextResponse.json({
      results,
      totalResults: results.length,
      query,
    })
  } catch (error) {
    console.error("[youtube/search] Error searching YouTube videos:", error)
    return NextResponse.json(
      { error: "YouTube 검색 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}