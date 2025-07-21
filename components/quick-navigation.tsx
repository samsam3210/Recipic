"use client"

import { Card } from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Play } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useEffect, useRef, useState } from "react"

interface QuickNavigationProps {
  steps: Array<{
    stepNumber: number
    description: string
    youtubeTimestampSecond: number
  }>
  handleSeekVideo: (timestamp: number) => void
  isPlayerReady: boolean
  currentVideoTime: number
}

export function QuickNavigation({ steps, handleSeekVideo, isPlayerReady, currentVideoTime }: QuickNavigationProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const activeStepRef = useRef<HTMLButtonElement>(null)
  const [activeStepIndex, setActiveStepIndex] = useState(-1)

  useEffect(() => {
    // 현재 비디오 시간에 가장 가까운 단계를 찾습니다.
    const newActiveIndex = steps.findIndex((step, index) => {
      const nextStepTime = steps[index + 1]?.youtubeTimestampSecond || Number.POSITIVE_INFINITY
      return currentVideoTime >= step.youtubeTimestampSecond && currentVideoTime < nextStepTime
    })
    setActiveStepIndex(newActiveIndex)
  }, [currentVideoTime, steps])

  useEffect(() => {
    // 활성화된 단계가 변경될 때 해당 버튼으로 스크롤합니다.
    if (activeStepRef.current && scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement
      if (scrollArea) {
        const buttonTop = activeStepRef.current.offsetTop
        const buttonHeight = activeStepRef.current.offsetHeight
        const scrollAreaHeight = scrollArea.clientHeight
        const scrollAreaScrollTop = scrollArea.scrollTop

        // 버튼이 뷰포트 상단 위로 벗어났거나 하단 아래로 벗어났을 때만 스크롤
        if (buttonTop < scrollAreaScrollTop || buttonTop + buttonHeight > scrollAreaScrollTop + scrollAreaHeight) {
          scrollArea.scrollTo({
            top: buttonTop - scrollAreaHeight / 2 + buttonHeight / 2, // 중앙으로 스크롤
            behavior: "smooth",
          })
        }
      }
    }
  }, [activeStepIndex])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`
  }

  return (
    <Card className="sticky top-[calc(64px+1.5rem)] lg:top-[calc(64px+2rem)] h-[calc(100vh-64px-3rem)] lg:h-[calc(100vh-64px-4rem)] overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">퀵 내비게이션</h3>
        <p className="text-sm text-muted-foreground">조리 단계별 영상 이동</p>
      </div>
      <ScrollArea className="h-[calc(100%-65px)]" ref={scrollAreaRef}>
        <div className="p-4 space-y-2">
          {steps.map((step, index) => (
            <Button
              key={step.stepNumber}
              variant="ghost"
              className={cn(
                "w-full justify-start h-auto py-2 px-3 text-left whitespace-normal break-words",
                "text-base font-normal",
                activeStepIndex === index ? "bg-muted text-primary-foreground" : "hover:bg-gray-100",
              )}
              onClick={() => handleSeekVideo(step.youtubeTimestampSecond)}
              disabled={!isPlayerReady}
              ref={activeStepIndex === index ? activeStepRef : null}
            >
              <Play className="mr-2 h-4 w-4 flex-shrink-0" />
              <div className="flex flex-col items-start">
                <span className="font-medium text-sm">
                  {step.stepNumber}. {formatTime(step.youtubeTimestampSecond)}
                </span>
                <span className="text-sm text-muted-foreground">{step.description}</span>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </Card>
  )
}
