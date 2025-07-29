"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AccountDeletionModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail: string
  onConfirm: () => Promise<void>
}

export function AccountDeletionModal({ 
  isOpen, 
  onClose, 
  userEmail, 
  onConfirm 
}: AccountDeletionModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const expectedText = "계정을 삭제합니다"
  const isConfirmTextValid = confirmText === expectedText

  const handleClose = () => {
    if (isDeleting) return
    setStep(1)
    setConfirmText("")
    onClose()
  }

  const handleNextStep = () => {
    setStep(2)
  }

  const handleConfirmDeletion = async () => {
    if (!isConfirmTextValid) {
      toast({
        title: "확인 텍스트 불일치",
        description: "정확한 텍스트를 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)
    try {
      await onConfirm()
    } catch (error) {
      // 에러는 onConfirm에서 처리
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            계정 삭제
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-1">
            {step === 1 ? "정말로 계정을 삭제하시겠습니까?" : "삭제를 확인해주세요"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="py-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-800 mb-2">주의사항</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• 저장된 모든 레시피가 영구 삭제됩니다</li>
                <li>• 생성한 폴더와 설정이 모두 사라집니다</li>
                <li>• 이 작업은 되돌릴 수 없습니다</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600">
              계정: <span className="font-medium">{userEmail}</span>
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="py-4">
            <p className="text-sm text-gray-700 mb-4">
              계정 삭제를 확인하려면 아래 텍스트를 정확히 입력해주세요:
            </p>
            <div className="bg-gray-100 p-3 rounded-lg mb-4">
              <code className="text-sm font-mono text-gray-800">{expectedText}</code>
            </div>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="위 텍스트를 정확히 입력하세요"
              className={`w-full ${confirmText && !isConfirmTextValid ? 'border-gray-400 focus:border-gray-500' : ''}`}
              disabled={isDeleting}
              autoComplete="off"
            />
            {confirmText && !isConfirmTextValid && (
              <p className="text-sm text-gray-600 mt-2">텍스트가 일치하지 않습니다.</p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isDeleting}
          >
            취소
          </Button>
          {step === 1 && (
            <Button
              variant="default"
              onClick={handleNextStep}
            >
              다음 단계
            </Button>
          )}
          {step === 2 && (
            <Button
              variant="default"
              onClick={handleConfirmDeletion}
              disabled={!isConfirmTextValid || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                "계정 삭제"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}