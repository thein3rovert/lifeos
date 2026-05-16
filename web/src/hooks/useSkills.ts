import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Skill, SkillDetail } from '@/types'

interface UseSkillsReturn {
  skills: Skill[]
  selectedSkill: Skill | null
  skillDetail: SkillDetail | null
  loading: boolean
  detailLoading: boolean
  error: Error | null
  selectSkill: (id: string) => void
  refreshSkills: () => Promise<void>
  refreshDetail: () => Promise<void>
}

export function useSkills(): UseSkillsReturn {
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const [skillDetail, setSkillDetail] = useState<SkillDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const selectedSkill = skills.find(s => s.id === selectedSkillId) || null

  const refreshSkills = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.skills.list()
      setSkills(data)
      if (data.length > 0 && !selectedSkillId) {
        setSelectedSkillId(data[0].id)
      }
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [selectedSkillId])

  const refreshDetail = useCallback(async () => {
    if (!selectedSkillId) return
    setDetailLoading(true)
    try {
      const data = await api.skills.get(selectedSkillId)
      setSkillDetail(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setDetailLoading(false)
    }
  }, [selectedSkillId])

  const selectSkill = useCallback((id: string) => {
    setSelectedSkillId(id)
    setSkillDetail(null)
  }, [])

  return {
    skills,
    selectedSkill,
    skillDetail,
    loading,
    detailLoading,
    error,
    selectSkill,
    refreshSkills,
    refreshDetail,
  }
}