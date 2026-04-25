// Types for skills feature

export type Skill = {
  id: string
  title: string
  format: string
  content: string
  updated_at: string
}

export type Note = {
  id: number
  skill_id: string
  content: string
  created_at: string
}

export type SkillDetail = {
  skill: Skill
  notes: Note[]
}
