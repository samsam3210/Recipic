"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog" // Import DialogPrimitive
import type React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react" // Import X icon

interface CustomDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string | React.ReactNode
  children?: React.ReactNode // 본문 내용
  footer?: React.ReactNode // 푸터 버튼 영역
  disableClose?: boolean // 외부 클릭 및 ESC 키로 닫기 방지
  className?: string // DialogContent에 추가할 클래스
  headerClassName?: string // DialogHeader에 추가할 클래스
  titleClassName?: string // DialogTitle에 추가할 클래스
  descriptionClassName?: string // DialogDescription에 추가할 클래스
  footerClassName?: string // DialogFooter에 추가할 클래스
  overlayClassName?: string // New prop for overlay styling
  hideCloseButton?: boolean // New prop to hide the 'X' button
}

export function CustomDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  disableClose = false,
  className,
  headerClassName,
  titleClassName,
  descriptionClassName,
  footerClassName,
  overlayClassName, // Destructure new prop
  hideCloseButton = false, // Destructure new prop with default
}: CustomDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            overlayClassName, // Apply custom overlay class
          )}
        />
        <DialogContent
          className={cn(
            "sm:max-w-[425px]",  // ← 이렇게만 하면 됩니다
            className,
          )}
          onPointerDownOutside={disableClose ? (e) => e.preventDefault() : undefined}
          onEscapeKeyDown={disableClose ? (e) => e.preventDefault() : undefined}
        >
          {/* Conditionally render the close button */}
          {!hideCloseButton && (
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
          <DialogHeader className={headerClassName}>
            <DialogTitle className={titleClassName}>{title}</DialogTitle>
            {description && <DialogDescription className={descriptionClassName}>{description}</DialogDescription>}
          </DialogHeader>
          {children}
          {footer && <DialogFooter className={footerClassName}>{footer}</DialogFooter>}
        </DialogContent>
      </DialogPrimitive.Portal>
    </Dialog>
  )
}
