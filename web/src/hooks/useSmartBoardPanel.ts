import { useState, useEffect, useCallback } from 'react'
import { toast } from '@/components/ui/Toast'
import type { PanelType, SmartBoardPanelResponse, ScheduleStatusMap } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL as string

type UseSmartBoardPanelReturn<T> = {
  data: T | null
  loading: boolean
  lastRefreshed: Date | null
  error: Error | null
  refresh: () => Promise<void>
  updateItemStatus: (itemId: string, status: string) => Promise<void>
}

export function useSmartBoardPanel<T>(
  panelType: PanelType
): UseSmartBoardPanelReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)

  // Fetch cached data on mount
  const fetchCachedData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/smartboard/${panelType}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch panel: ${response.statusText}`)
      }
      
      const result: SmartBoardPanelResponse = await response.json()
      setData(result.data as T)
      setLastRefreshed(result.lastRefreshed ? new Date(result.lastRefreshed) : null)
      setError(null)
    } catch (err) {
      console.error(`Failed to fetch ${panelType}:`, err)
      setError(err as Error)
    }
  }, [panelType])

  // Refresh panel with fresh AI data
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/smartboard/refresh/${panelType}`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error(`Failed to refresh panel: ${response.statusText}`)
      }
      
      const result: SmartBoardPanelResponse = await response.json()
      setData(result.data as T)
      setLastRefreshed(new Date())
      setError(null)
      toast('Panel updated successfully', 'success')
    } catch (err) {
      console.error(`Failed to refresh ${panelType}:`, err)
      setError(err as Error)
      toast('Failed to refresh panel', 'error')
    } finally {
      setLoading(false)
    }
  }, [panelType])

  // Update item status
  const updateItemStatus = useCallback(
    async (itemId: string, status: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/smartboard/item/${itemId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            panelType,
            status,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to update item: ${response.statusText}`)
        }

        // Refresh cached data after update
        await fetchCachedData()
        toast('Item updated', 'success')
      } catch (err) {
        console.error(`Failed to update item status:`, err)
        toast('Failed to update item', 'error')
      }
    },
    [panelType, fetchCachedData]
  )

  // Fetch cached data on mount
  useEffect(() => {
    fetchCachedData()
  }, [fetchCachedData])

  return {
    data,
    loading,
    lastRefreshed,
    error,
    refresh,
    updateItemStatus,
  }
}

/**
 * Fetches scheduler status (next refresh time, last error) for all panels.
 * Polls every 60 seconds to keep "next refresh" countdown accurate.
 */
export function useScheduleStatus() {
  const [schedule, setSchedule] = useState<ScheduleStatusMap | null>(null)

  const fetchSchedule = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/smartboard/schedule`)
      if (!response.ok) return
      const data = await response.json()
      setSchedule(data as ScheduleStatusMap)
    } catch {
      // Silently ignore — schedule is non-critical UI
    }
  }, [])

  useEffect(() => {
    fetchSchedule()
    const interval = setInterval(fetchSchedule, 60_000) // poll every 60s
    return () => clearInterval(interval)
  }, [fetchSchedule])

  return schedule
}
