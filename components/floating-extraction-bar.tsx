"use client"

import React, { useEffect, useRef, useState } from 'react'
import { X, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useExtraction } from '@/contexts/extraction-context'
import { Button } from '@/components/ui/button'
import { CustomDialog } from './custom-dialog'

export function FloatingExtractionBar() {
  const { 
    isExtracting, 
    steps, 
    currentStep, 
    progress, 
    error, 
    isCompleted,
    completedRecipeId,
    isCollapsed,
    showDuplicateModal,
    duplicateInfo,
    dismissExtraction,
    navigateToRecipe,
    toggleCollapse,
    stopExtraction,
    handleDuplicateConfirm,
    handleDuplicateCancel
  } = useExtraction()
  
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Visibility management
  useEffect(() => {
    if (isExtracting || isCompleted || error) {
      setShouldRender(true)
      setIsVisible(true)
    } else {
      setIsVisible(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false)
      }, 300)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isExtracting, isCompleted, error])

  const handleToggleCollapse = () => {
    toggleCollapse()
  }

  const handleNavigateToRecipe = () => {
    navigateToRecipe()
  }

  if (!shouldRender) return null

  return (
    <div
      className={cn(
        "fixed bottom-20 left-4 right-4 mx-auto max-w-md z-50 transition-all duration-300 ease-in-out",
        "lg:bottom-6 lg:left-1/2 lg:transform lg:-translate-x-1/2",
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            {error ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : isCompleted ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            )}
            <h3 className="font-semibold text-gray-900">
              {error ? "추출 실패" : isCompleted ? "추출 완료!" : "레시피 추출 중"}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {error || isCompleted ? (
              // 에러 상태 또는 완료 상태: 닫기 버튼만 표시
              <button
                onClick={dismissExtraction}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="닫기"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            ) : isCollapsed ? (
              // 진행 중 - 접힌 상태: 펼치기 + 닫기 버튼
              <>
                <button
                  onClick={handleToggleCollapse}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  title="펼치기"
                >
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={dismissExtraction}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  title="닫기"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </>
            ) : (
              // 진행 중 - 펼쳐진 상태: 접기 버튼만
              <button
                onClick={handleToggleCollapse}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="접기"
              >
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsed State - 접힌 상태에서 표시할 내용 */}
        {isCollapsed && (
          <div className="px-4 pb-4">
            {/* 진행 중일 때: 진행바만 표시 */}
            {!error && !isCompleted && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            
            {/* 완료 상태일 때: 레시피 보기 버튼 표시 */}
            {isCompleted && completedRecipeId && (
              <Button 
                onClick={handleNavigateToRecipe}
                className="w-full bg-gray-900 hover:bg-black text-white rounded-xl font-semibold transition-all duration-300 shadow-lg"
                size="sm"
              >
                레시피 보기
              </Button>
            )}
            
            {/* 에러 상태일 때: 에러 메시지 표시 */}
            {error && (
              <div className="text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Expanded Content - 펼쳐진 상태에서만 표시 */}
        {!isCollapsed && (
          <div className="px-4 pb-4">
            {/* Error State */}
            {error && (
              <div className="text-sm text-red-600 mb-3">
                {error}
              </div>
            )}

            {/* Completed State */}
            {isCompleted && completedRecipeId && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  레시피가 성공적으로 추출되었습니다!
                </p>
                <Button 
                  onClick={handleNavigateToRecipe}
                  className="w-full bg-gray-900 hover:bg-black text-white rounded-xl font-semibold transition-all duration-300 shadow-lg"
                >
                  레시피 보기
                </Button>
              </div>
            )}

            {/* Progress State */}
            {!error && !isCompleted && (
              <>
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Steps */}
                <div className="space-y-3 mb-4">
                  {steps.map((step) => {
                    const isActive = step.id === currentStep
                    const isCompleted = step.status === 'completed'
                    const isError = step.status === 'error'
                    
                    return (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                          isCompleted && "bg-green-500 text-white",
                          isActive && !isCompleted && "bg-blue-500 text-white animate-pulse",
                          !isActive && !isCompleted && !isError && "bg-gray-200 text-gray-500",
                          isError && "bg-red-500 text-white"
                        )}>
                          {isCompleted ? "✓" : step.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium transition-colors duration-300",
                            isCompleted && "text-green-600",
                            isActive && !isCompleted && "text-blue-600",
                            !isActive && !isCompleted && !isError && "text-gray-500",
                            isError && "text-red-600"
                          )}>
                            {step.title}
                          </p>
                          <p className={cn(
                            "text-xs transition-colors duration-300 truncate",
                            isActive && !isCompleted && "text-blue-500",
                            isCompleted && "text-green-500",
                            !isActive && !isCompleted && !isError && "text-gray-400",
                            isError && "text-red-500"
                          )}>
                            {step.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Stop Button */}
                <Button 
                  onClick={stopExtraction}
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                >
                  추출 중지
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 중복 레시피 확인 모달 */}
      <CustomDialog
        isOpen={showDuplicateModal}
        onClose={handleDuplicateCancel}
        title={
          duplicateInfo.type === 'saved' 
            ? "이미 저장된 레시피예요." 
            : "최근에 본 레시피예요."
        }
        description={
          duplicateInfo.type === 'saved'
            ? "레시피 정보 화면으로 바로 이동할까요?"
            : "레시피를 다시 확인하시겠어요?"
        }
        className="sm:max-w-[425px]"
        footerClassName="flex flex-col sm:flex-row sm:justify-end gap-2 mt-4"
        hideCloseButton={true}
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={handleDuplicateCancel}
              className="flex-1 py-3 px-4 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl transition-all duration-300"
            >
              아니요, 다른 영상 입력할게요
            </Button>
            <Button 
              onClick={handleDuplicateConfirm}
              className="flex-1 py-3 px-4 text-sm font-semibold bg-gray-900 hover:bg-black text-white rounded-xl transition-all duration-300 shadow-lg"
            >
              {duplicateInfo.type === 'saved' ? "예, 기존 레시피 보기" : "예, 레시피 확인하기"}
            </Button>
          </>
        }
      />
    </div>
  )
}