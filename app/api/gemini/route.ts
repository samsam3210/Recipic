import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { NextResponse } from "next/server"

export const maxDuration = 59 // Vercel Serverless Functions 최대 실행 시간 60초로 재설정

export async function POST(req: Request) {
  const { structuredTranscript, videoDescription } = await req.json()

  if (!structuredTranscript || !Array.isArray(structuredTranscript) || structuredTranscript.length === 0) {
    return NextResponse.json({ error: "Structured transcript is required and must be an array." }, { status: 400 })
  }

  const transcriptForPrompt = structuredTranscript
    .map((item: { text: string; offset: number }) => `[${item.offset}s] ${item.text}`)
    .join("\n")

  const truncatedVideoDescription = videoDescription ? videoDescription.substring(0, 1500) : "영상 설명란이 없습니다."
  if (videoDescription && videoDescription.length > 1500) {
    console.warn("[gemini/route] videoDescription was truncated to 1500 characters.")
  }

  const prompt = `다음은 유튜브 요리 영상의 자막 텍스트와 영상 설명란 정보입니다.
자막 텍스트 각 줄은 "[시간(초)s] 텍스트" 형식으로, 해당 텍스트가 영상에서 시작되는 시간을 나타냅니다.
영상 설명란은 영상 제작자가 제공한 추가 정보입니다.

**지시사항:**
1.  **재료 및 조리 단계 추출**: 영상 설명란에 재료 목록이나 조리 순서가 명확하게 정리되어 있다면, 해당 정보를 **우선적으로** 사용하여 재료와 조리 단계를 추출하세요. 자막 정보는 보조적으로 활용하여 누락된 세부 사항을 보완하거나, 설명란에 없는 정보를 추가하는 데 사용하세요.
2.  **재료 양 정보**: 재료의 양 정보는 영상이나 설명에서 언급된 내용을 최대한 상세하게 추출하되, 명확한 수치나 단위가 없더라도 '약간', '적당량', '조금', '한 줌'과 같은 양적 표현이 있다면 이를 \`quantity\` 필드에 문자열로 그대로 기입하세요. '토막', '손질된', '다진 것' 등은 양 정보가 아닌 상태 정보이므로 \`notes\` 필드에 기입하세요. 양 정보가 전혀 없는 경우 \`quantity\` 필드를 빈 문자열(\"\")로 기입하세요.
3.  **조리 단계별 사용 재료**: 각 조리 단계의 \`ingredientsUsed\` 필드에는 해당 단계에서 **새롭게 투입되거나 사용이 시작되는** 재료만 ���함해야 하며, 각 재료는 이름과 함께 **정량 정보**를 명확히 포함해야 합니다 (예: '고춧가루 0.5큰술', '다진 마늘 1큰술'). 재료 이름 뒤에 공백 없이 정량 정보를 붙여주세요. 이미 이전 단계에서 투입된 재료는 다시 명시하지 않습니다. 해당 단계에서 새롭게 추가되는 재료가 없으면 빈 배열로 기입하세요.
4.  **youtubeTimestampSecond**: 각 조리 단계의 'youtubeTimestampSecond'는 해당 단계의 설명이 영상에서 시작되는 정확한 초를 나타내야 합니다. 이는 자막의 시간 정보를 기반으로 추출해야 합니다.
5.  **누락된 레시피**: 만약 레시피를 찾을 수 없다면, \`recipeName\`을 \`null\`로, \`noRecipeFoundMessage\`에 적절한 안내 문구를 넣어주세요.

--- 영상 설명란 시작 ---
${truncatedVideoDescription}
--- 영상 설명란 끝 ---

--- 자막 텍스트 시작 ---
${transcriptForPrompt}
--- 자막 텍스트 끝 ---

결과는 아래 JSON 스키마를 따릅니다:
\`\`\`json
{
  \"recipeName\": \"string | null\",
  \"noRecipeFoundMessage\": \"string | null\",
  \"summary\": \"string\",
  \"difficulty\": \"string\",
  \"cookingTimeMinutes\": \"number\",
  \"ingredients\": [
    {
      \"name\": \"string\",
      \"quantity\": \"string\",
      \"unit\": \"string | null\",
      \"notes\": \"string\"
    }
  ],
  \"steps\": [
    {
      \"stepNumber\": \"number\",
      \"description\": \"string\",
      \"notes\": \"string\",
      \"ingredientsUsed\": \"array\",
      \"youtubeTimestampSecond\": \"number\"
    }
  ],
  \"tips\": [
    {
      \"title\": \"string\",
      \"description\": \"string\"
    }
  ]
}
\`\`\`
`
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables. Please configure it.")
    }

    const { text } = await generateText({
      model: google("gemini-2.0-flash-lite"),
      system:
        "You are an expert AI for extracting cooking recipes from YouTube video transcripts and descriptions into a precise JSON format. Focus solely on recipe details. If information is missing, use `null` or empty arrays, and provide a `noRecipeFoundMessage`. Crucially, accurately extract `youtubeTimestampSecond` for each step based on subtitle timings.",
      prompt: prompt,
    })

    try {
      let parsedText = text
      if (parsedText.startsWith("```json")) {
        parsedText = parsedText.substring("```json".length, parsedText.lastIndexOf("```")).trim()
      }
      JSON.parse(parsedText) // 파싱 성공 여부만 확인
    } catch (parseError) {
      console.error("[gemini/route] Failed to parse Gemini response for logging:", parseError)
    }

    return new Response(text, {
      headers: { "Content-Type": "text/plain" },
    })
  } catch (error) {
    console.error("[gemini/route] Error calling Gemini API:", error)
    return NextResponse.json(
      { error: `Failed to extract recipe using AI: ${(error as Error).message || "Unknown error"}` },
      { status: 500 },
    )
  }
}
