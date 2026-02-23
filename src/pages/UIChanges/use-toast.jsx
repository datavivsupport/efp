import React from "react"

let memoryState = []
const listeners = []

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 8000

function dispatch(toasts) {
  memoryState = toasts
  listeners.forEach((listener) => listener(memoryState))
}

export function useToast() {
  const [toasts, setToasts] = React.useState(memoryState)

  React.useEffect(() => {
    listeners.push(setToasts)
    return () => {
      const index = listeners.indexOf(setToasts)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])

  const toast = ({ title, description, variant = "default" }) => {
    const id = crypto.randomUUID()

    const newToast = { id, title, description, variant }

    dispatch([newToast, ...memoryState].slice(0, TOAST_LIMIT))

    setTimeout(() => {
      dispatch(memoryState.filter((t) => t.id !== id))
    }, TOAST_REMOVE_DELAY)
  }

  return { toast, toasts }
}