import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { X } from "lucide-react"
import { cn } from "../../Utility/util"

export const ToastProvider = ToastPrimitives.Provider

export const ToastViewport = React.forwardRef(function ToastViewport(
  { className, ...props },
  ref
) {
  return (
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(
        "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
        className
      )}
      {...props}
    />
  )
})

export const Toast = React.forwardRef(function Toast(
  { className, variant = "default", ...props },
  ref
) {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
        "data-[state=open]:slide-in-from-top-full sm:data-[state=open]:slide-in-from-bottom-full",
        variant === "destructive" &&
          "border-red-500 bg-red-500 text-white",
        variant === "success" &&
          "border-green-500 bg-green-500 text-white",
        variant === "warning" &&
          "border-yellow-500 bg-yellow-400 text-black",
        variant === "default" &&
          "border bg-white text-black",
        className
      )}
      {...props}
    />
  )
})

export const ToastTitle = React.forwardRef(function ToastTitle(
  { className, ...props },
  ref
) {
  return (
    <ToastPrimitives.Title
      ref={ref}
      className={cn("text-sm font-semibold", className)}
      {...props}
    />
  )
})

export const ToastDescription = React.forwardRef(function ToastDescription(
  { className, ...props },
  ref
) {
    return (
      <ToastPrimitives.Description
        ref={ref}
        className={cn("text-sm opacity-90", className)}
        {...props}
      />
    )
})

export const ToastClose = React.forwardRef(function ToastClose(
  { className, ...props },
  ref
) {
  return (
    <ToastPrimitives.Close
      ref={ref}
      className={cn(
        "absolute right-2 top-2 rounded-md p-1 opacity-70 hover:opacity-100 focus:outline-none",
        className
      )}
      toast-close=""
      {...props}
    >
      <X className="h-4 w-4" />
    </ToastPrimitives.Close>
  )
})