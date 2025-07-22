// app/api/youtube/search/route.ts
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { query, maxResults = 10 } = await req.json()

  if (!query) {
    return NextResponse.json({ error: "검색 키워드가 필요합니다." }, { status: 400 })
  }

  try {
    const youtubeApiKey = process.env.YOUTUBE_API_KEY
    if (!youtubeApiKey) {
      throw new Error("YOUTUBE_API_KEY is not set in environment variables.")
    }

    // YouTube Data API v3의 search 엔드포인트 사용
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
      new URLSearchParams({
        part: 'snippet',
        q: `${query} 요리 레시피`, // 요리 관련 검색으로 필터링
        type: 'video',
        videoCategoryId: '26', // 26은 "Howto & Style" 카테고리 (요리 영상이 많음)
        maxResults: maxResults.toString(),
        order: 'relevance', // 관련성 순으로 정렬
        videoDefinition: 'any',
        videoDuration: 'medium',
        key: youtubeApiKey
      }).toString()
    )

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json()
      console.error("[youtube/search] YouTube Search API Error:", errorData)
      return NextResponse.json({ error: "YouTube 검색 API 오류가 발생했습니다." }, { status: 500 })
    }

    const searchData = await searchResponse.json()

    if (!searchData.items || searchData.items.length === 0) {
      return NextResponse.json({ 
        results: [], 
        message: "검색 결과가 없습니다. 다른 키워드로 시도해보세요." 
      })
    }

    // 검색 결과에서 필요한 정보만 추출하여 반환
    const results = searchData.items.map((item: any) => {
      // YouTube Data API v3 search는 videoId만 제공하므로 URL을 직접 구성
      const videoId = item.id.videoId
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`

      return {
        videoId: videoId,
        title: item.snippet.title,
        channelName: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        youtubeUrl: youtubeUrl  // videoId로부터 YouTube URL 구성
      }
    })

    // 추가로 videos API를 호출하여 duration, view count 등 상세 정보 가져오기
    const videoIds = results.map(result => result.videoId).join(',')
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
      new URLSearchParams({
        part: 'contentDetails,statistics',
        id: videoIds,
        key: youtubeApiKey
      }).toString()
    )

    if (videosResponse.ok) {
      const videosData = await videosResponse.json()
      
      // duration과 view count 정보를 결과에 추가
      const videosMap = new Map(
        videosData.items.map((video: any) => [
          video.id,
          {
            duration: video.contentDetails.duration,
            viewCount: video.statistics.viewCount
          }
        ])
      )

      // duration을 사람이 읽기 쉬운 형태로 변환
      const parseDuration = (duration: string) => {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
        if (!match) return "0:00"
        
        const hours = parseInt(match[1] || "0", 10)
        const minutes = parseInt(match[2] || "0", 10)
        const seconds = parseInt(match[3] || "0", 10)
        
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        } else {
          return `${minutes}:${seconds.toString().padStart(2, '0')}`
        }
      }

      // view count를 사람이 읽기 쉬운 형태로 변환
      const formatViewCount = (viewCount: string) => {
        const count = parseInt(viewCount)
        if (count >= 1000000) {
          return `${(count / 1000000).toFixed(1)}M`
        } else if (count >= 1000) {
          return `${(count / 1000).toFixed(1)}K`
        } else {
          return count.toString()
        }
      }

      // 업로드 시간을 상대적 시간으로 변환
      const formatPublishedTime = (publishedAt: string) => {
        const now = new Date()
        const published = new Date(publishedAt)
        const diffInDays = Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24))
        
        if (diffInDays === 0) {
          return "오늘"
        } else if (diffInDays === 1) {
          return "1일 전"
        } else if (diffInDays < 7) {
          return `${diffInDays}일 전`
        } else if (diffInDays < 30) {
          const weeks = Math.floor(diffInDays / 7)
          return `${weeks}주 전`
        } else if (diffInDays < 365) {
          const months = Math.floor(diffInDays / 30)
          return `${months}개월 전`
        } else {
          const years = Math.floor(diffInDays / 365)
          return `${years}년 전`
        }
      }

      // 결과에 추가 정보 병합
      results.forEach((result: any) => {
        const videoInfo = videosMap.get(result.videoId)
        if (videoInfo) {
          result.duration = parseDuration(videoInfo.duration)
          result.viewCount = formatViewCount(videoInfo.viewCount)
          result.publishedTime = formatPublishedTime(result.publishedAt)
        }
      })
    }

    return NextResponse.json({
      results,
      totalResults: searchData.pageInfo?.totalResults || 0,
      query
    })

  } catch (error) {
    console.error("[youtube/search] Error searching YouTube videos:", error)
    return NextResponse.json({ 
      error: "YouTube 검색 중 오류가 발생했습니다." 
    }, { status: 500 })
  }
}