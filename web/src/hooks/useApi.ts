import { useState, useCallback } from 'react'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: () => Promise<void>
  reset: () => void
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  immediate = true
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: immediate,
    error: null,
  })

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const result = await fetcher()
      setState({ data: result, loading: false, error: null })
    } catch (err) {
      setState({ data: null, loading: false, error: err as Error })
    }
  }, [fetcher])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return { ...state, execute, reset }
}

interface UseApiMutationState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

interface UseApiMutationReturn<T, Args extends unknown[]> extends UseApiMutationState<T> {
  mutate: (...args: Args) => Promise<T | null>
  reset: () => void
}

export function useApiMutation<T, Args extends unknown[]>(
  fetcher: (...args: Args) => Promise<T>
): UseApiMutationReturn<T, Args> {
  const [state, setState] = useState<UseApiMutationState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const mutate = useCallback(async (...args: Args): Promise<T | null> => {
    setState({ data: null, loading: true, error: null })
    try {
      const result = await fetcher(...args)
      setState({ data: result, loading: false, error: null })
      return result
    } catch (err) {
      setState({ data: null, loading: false, error: err as Error })
      return null
    }
  }, [fetcher])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return { ...state, mutate, reset }
}