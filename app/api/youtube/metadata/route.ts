import { NextResponse } from "next/server"
import { getVideoDetails } from "@/lib/utils/youtube-api-wrapper"

export async function POST(req: Request) {
  const { youtubeUrl } = await req.json()

  if (!youtubeUrl) {
    return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 })
  }

const videoIdMatch = youtubeUrl.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})(?:\S+)?/,
  )
  const videoId = videoIdMatch ? videoIdMatch[1] : null

  if (!videoId) {
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 })
  }

  try {
    // Fetch video details from YouTube Data API using wrapper
    const videoDetailsData = await getVideoDetails(videoId)

    if (!videoDetailsData.items || videoDetailsData.items.length === 0) {
      return NextResponse.json({ error: "Video not found or unavailable" }, { status: 404 })
    }

    const video = videoDetailsData.items[0]
    const videoTitle = video.snippet.title
    const videoThumbnail = video.snippet.thumbnails.high.url
    const channelName = video.snippet.channelTitle
    const videoDuration = video.contentDetails.duration // PT#M#S format
    const videoViews = video.statistics.viewCount
    const videoDescription = video.snippet.description

    // Convert duration to seconds (simplified for common formats)
    const parseDuration = (duration: string) => {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      if (!match) return 0
      const hours = Number.parseInt(match[1] || "0", 10)
      const minutes = Number.parseInt(match[2] || "0", 10)
      const seconds = Number.parseInt(match[3] || "0", 10)
      return hours * 3600 + minutes * 60 + seconds
    }
    const videoDurationSeconds = parseDuration(videoDuration)

    return NextResponse.json({
      videoId,
      videoTitle,
      videoThumbnail,
      channelName,
      videoDurationSeconds,
      videoViews,
      videoDescription,
    })
  } catch (error) {
    console.error("[youtube/metadata] Error processing YouTube URL:", error)
    return NextResponse.json({ error: (error as Error).message || "Failed to process YouTube URL" }, { status: 500 })
  }
}
