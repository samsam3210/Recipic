import { NextResponse } from "next/server"
import { getVideoDetails, getChannelDetails } from "@/lib/utils/youtube-api-wrapper"

export const maxDuration = 30 // Allow streaming responses up to 30 seconds

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
      console.error("YouTube API Error:", "No video found")
      return NextResponse.json({ error: "Failed to fetch video details from YouTube API" }, { status: 500 })
    }

    const video = videoDetailsData.items[0]
    const videoTitle = video.snippet.title
    const videoThumbnail = video.snippet.thumbnails.high.url
    const channelName = video.snippet.channelTitle
    const channelId = video.snippet.channelId
    const videoDuration = video.contentDetails.duration // PT#M#S format
    const videoViews = video.statistics.viewCount
    const videoDescription = video.snippet.description

    // 채널 정보 추가 조회
    let channelThumbnail = null
    let channelUrl = null
    
    if (channelId) {
      try {
        const channelDetailsData = await getChannelDetails(channelId)
        if (channelDetailsData.items && channelDetailsData.items.length > 0) {
          const channel = channelDetailsData.items[0]
          channelThumbnail = channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url || null
          channelUrl = `https://www.youtube.com/channel/${channelId}`
        }
      } catch (channelError) {
        console.warn(`[youtube/route] Failed to fetch channel details for channelId: ${channelId}`, channelError)
        // 채널 정보 조회 실패해도 레시피 추출은 계속 진행
      }
    }

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

    // Fetch subtitles from youtube-transcript.io using the documented API
    const youtubeTranscriptApiToken = process.env.YOUTUBE_TRANSCRIPT_API_KEY // This should now be the Basic API token
    const youtubeTranscriptApiUrl = "https://www.youtube-transcript.io/api/transcripts" // Base URL from documentation

    if (!youtubeTranscriptApiToken) {
      throw new Error(
        "YOUTUBE_TRANSCRIPT_API_KEY is missing. Please ensure it's set to your 'Basic API token' from youtube-transcript.io profile. Example: 'YOUR_BASIC_TOKEN_HERE'",
      )
    }

    const subtitlesResponse = await fetch(youtubeTranscriptApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${youtubeTranscriptApiToken}`, // Use Basic Auth as per documentation
      },
      body: JSON.stringify({ ids: [videoId] }), // Send videoId in 'ids' array as per documentation
    })

    let transcriptText = ""
    let structuredTranscript: { text: string; offset: number }[] = [] // 새로운 구조화된 자막 데이터
    let hasSubtitles = false

    const rawSubtitlesResponseText = await subtitlesResponse.text()

    if (subtitlesResponse.ok) {
      try {
        const subtitlesData = JSON.parse(rawSubtitlesResponseText)

        if (
          Array.isArray(subtitlesData) &&
          subtitlesData.length > 0 &&
          subtitlesData[0] &&
          Array.isArray(subtitlesData[0].tracks) &&
          subtitlesData[0].tracks.length > 0 &&
          subtitlesData[0].tracks[0] &&
          Array.isArray(subtitlesData[0].tracks[0].transcript) &&
          subtitlesData[0].tracks[0].transcript.length > 0
        ) {
          structuredTranscript = subtitlesData[0].tracks[0].transcript.map(
            (t: { text: string; start: number; duration: number }) => ({
              text: t.text,
              offset: t.start,
            }),
          )
          transcriptText = structuredTranscript.map((t) => t.text).join(" ") // 기존 transcriptText도 유지 (필요시)
          hasSubtitles = true
        } else {
          console.warn(
            `[youtube/route] Subtitle API returned valid JSON but no valid transcript data found in the expected format for video ${videoId}.`,
          )
          hasSubtitles = false
          transcriptText = ""
          structuredTranscript = []
        }
      } catch (jsonError) {
        console.warn(`[youtube/route] Subtitle API response for video ${videoId} was not valid JSON.`, jsonError)
        hasSubtitles = false
        transcriptText = ""
        structuredTranscript = []
      }
    } else {
      console.warn(
        `[youtube/route] Failed to fetch subtitles from youtube-transcript.io for video ID: ${videoId}. Status: ${subtitlesResponse.status}`,
      )
      console.error("[youtube/route] Subtitle API Error Response:", rawSubtitlesResponseText)
      hasSubtitles = false
      transcriptText = ""
      structuredTranscript = []
    }

    return NextResponse.json({
      videoId,
      videoTitle,
      videoThumbnail,
      channelName,
      channelId,
      channelUrl,
      channelThumbnail,
      videoDurationSeconds,
      videoViews,
      videoDescription,
      transcriptText,
      structuredTranscript,
      hasSubtitles,
    })
  } catch (error) {
    console.error("[youtube/route] Error processing YouTube URL:", error)
    return NextResponse.json({ error: (error as Error).message || "Failed to process YouTube URL" }, { status: 500 })
  }
}