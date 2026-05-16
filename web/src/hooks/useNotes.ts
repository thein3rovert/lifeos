import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Note } from '@/types'

interface UseNotesReturn {
  notes: Note[]
  loading: boolean
  adding: boolean
  error: Error | null
  loadNotes: (skillId: string) => Promise<void>
  addNote: (skillId: string, title: string, content: string) => Promise<Note[] | null>
  editNote: (skillId: string, noteId: number, title: string, content: string) => Promise<boolean>
  deleteNote: (skillId: string, noteId: number) => Promise<boolean>
  clearNotes: () => void
}

export function useNotes(): UseNotesReturn {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadNotes = useCallback(async (skillId: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.notes.list(skillId)
      setNotes(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  const addNote = useCallback(async (skillId: string, title: string, content: string): Promise<Note[] | null> => {
    setAdding(true)
    setError(null)
    try {
      const updatedNotes = await api.notes.add(skillId, title, content)
      setNotes(updatedNotes)
      return updatedNotes
    } catch (err) {
      setError(err as Error)
      return null
    } finally {
      setAdding(false)
    }
  }, [])

  const editNote = useCallback(async (skillId: string, noteId: number, title: string, content: string): Promise<boolean> => {
    setAdding(true)
    setError(null)
    try {
      await api.notes.edit(skillId, noteId, title, content)
      const updatedNotes = await api.notes.list(skillId)
      setNotes(updatedNotes)
      return true
    } catch (err) {
      setError(err as Error)
      return false
    } finally {
      setAdding(false)
    }
  }, [])

  const deleteNote = useCallback(async (skillId: string, noteId: number): Promise<boolean> => {
    setError(null)
    try {
      await api.notes.delete(skillId, noteId)
      setNotes(prev => prev.filter(n => n.id !== noteId))
      return true
    } catch (err) {
      setError(err as Error)
      return false
    }
  }, [])

  const clearNotes = useCallback(() => {
    setNotes([])
  }, [])

  return {
    notes,
    loading,
    adding,
    error,
    loadNotes,
    addNote,
    editNote,
    deleteNote,
    clearNotes,
  }
}