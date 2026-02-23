import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastViewport,
} from "./toast"

import { useToast } from "./use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <>
      {toasts.map(({ id, title, description, variant }) => (
        <Toast key={id} variant={variant} open>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && (
              <ToastDescription>{description}</ToastDescription>
            )}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </>
  )
}