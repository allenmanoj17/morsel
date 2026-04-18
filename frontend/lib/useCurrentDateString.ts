'use client'

import { useEffect, useState } from 'react'
import { getLocalDateString } from '@/lib/utils'

export function useCurrentDateString() {
  const [today, setToday] = useState(() => getLocalDateString())

  useEffect(() => {
    const refresh = () => {
      setToday((prev) => {
        const next = getLocalDateString()
        return prev === next ? prev : next
      })
    }

    refresh()
    const timer = window.setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return today
}
