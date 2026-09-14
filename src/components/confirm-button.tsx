'use client'

/**
 * 取り消せない操作に確認をはさむ送信ボタン。
 * JavaScript が無効な環境では確認なしでそのまま送信される（機能は失われない）。
 */
export function ConfirmButton({
  children,
  message,
  className = 'btn btn-danger',
}: {
  children: React.ReactNode
  message: string
  className?: string
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault()
      }}
    >
      {children}
    </button>
  )
}
