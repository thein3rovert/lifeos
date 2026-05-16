import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  TrendingUp,
  Image as ImageIcon,
  BookOpen,
  Search,
  Plus
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Note, Skill } from '@/types'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

const API_URL = 'http://100.105.217.77:6060'

async function fetchStats() {
  const [skills, photos] = await Promise.all([
    api.skills.list(),
    fetch(`${API_URL}/api/photos`).then(r => r.json())
  ])

  return {
    totalSkills: skills.length,
    totalPhotos: photos.length,
    skillsTrend: '+5',
    photosTrend: '+12'
  }
}

async function fetchNotes() {
  return api.notes.listAll()
}

function DashboardPage() {
  const [stats, setStats] = useState({
    totalSkills: 0,
    totalPhotos: 0,
    skillsTrend: '+0',
    photosTrend: '+0'
  })
  const [notes, setNotes] = useState<Note[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    Promise.all([
      fetchStats(),
      fetchNotes(),
      api.skills.list()
    ])
      .then(([statsData, notesData, skillsData]) => {
        setStats(statsData)
        setNotes(notesData)
        setSkills(skillsData)
      })
      .finally(() => setLoading(false))
  }, [])

  // Helper to get skill title by ID
  const getSkillTitle = (skillId: string) => {
    const skill = skills.find(s => s.id === skillId)
    return skill?.title || skillId
  }

  // Filter notes by search query
  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      note.content.toLowerCase().includes(query) ||
      getSkillTitle(note.skill_id).toLowerCase().includes(query)
    )
  })

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Top row - Stats + Empty placeholder */}
      <div className="flex gap-4">
        {/* Stats cards - 2/3 width */}
        <div className="flex-1 flex gap-4">
          <StatCard
            label="Total Skills"
            value={stats.totalSkills}
            trend={stats.skillsTrend}
            icon={<BookOpen className="w-5 h-5" strokeWidth={1.5} />}
            loading={loading}
          />
          <StatCard
            label="Total Photos"
            value={stats.totalPhotos}
            trend={stats.photosTrend}
            icon={<ImageIcon className="w-5 h-5" strokeWidth={1.5} />}
            loading={loading}
          />
        </div>

        {/* Empty placeholder - 1/3 width */}
        <div className="w-1/3 border border-default rounded bg-input flex items-center justify-center text-muted text-xs">
          Empty for now
        </div>
      </div>

      {/* Middle row - Notes table + Empty placeholder */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Today's Notes - 2/3 width */}
        <div className="flex-1 border border-default rounded bg-input flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-default">
            <span className="text-xs font-medium text-secondary">Today's Notes</span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-6 pl-7 pr-2 text-xs bg-input border border-default rounded text-secondary placeholder:text-muted focus:outline-none focus:border-strong w-40"
                />
              </div>
              <button className="h-6 px-2 flex items-center justify-center bg-accent-primary hover:brightness-95 text-black rounded transition-colors duration-150">
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-4 px-3 py-1.5 border-b border-default text-xxs uppercase tracking-wider text-tertiary">
            <span>Note description</span>
            <span>Skills</span>
            <span>Tags</span>
            <span>Date</span>
          </div>

          {/* Table body */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted text-xs">
                Loading notes...
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted text-xs">
                {searchQuery ? 'No notes match your search' : 'No notes yet'}
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="grid grid-cols-4 px-3 py-2 border-b border-subtle hover:bg-hover transition-colors duration-150 cursor-pointer"
                >
                  <span className="text-xs text-secondary truncate" title={note.content}>
                    {note.content}
                  </span>
                  <span className="text-xs text-highlight truncate" title={getSkillTitle(note.skill_id)}>
                    {getSkillTitle(note.skill_id)}
                  </span>
                  <span className="text-xs text-tertiary">-</span>
                  <span className="text-xs text-tertiary">
                    {(() => {
                      try {
                        // Parse Go timestamp: "2026-04-24 22:34:14.340107457 +0100 BST"
                        const dateStr = note.created_at.split(' ')[0] // Get just "2026-04-24"
                        const date = new Date(dateStr)
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      } catch {
                        return 'Invalid Date'
                      }
                    })()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Empty placeholder - 1/3 width */}
        <div className="w-1/3 border border-default rounded bg-input flex items-center justify-center text-muted text-xs">
          Empty for now
        </div>
      </div>

      {/* Bottom row - Empty placeholder */}
      <div className="h-24 border border-default rounded bg-input flex items-center justify-center text-muted text-xs">
        Empty for now
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  trend,
  icon,
  loading
}: {
  label: string
  value: number
  trend: string
  icon: React.ReactNode
  loading: boolean
}) {
  return (
    <div className="border border-default rounded bg-input p-4 flex items-start justify-between">
      <div className="space-y-1">
        <span className="text-[11px] text-tertiary uppercase tracking-wide">{label}</span>
        <div className="text-3xl font-semibold text-white">
          {loading ? '-' : value}
        </div>
        <div className="flex items-center gap-1 text-xs">
          <TrendingUp className="w-3 h-3 text-success" strokeWidth={1.5} />
          <span className="text-success">{trend} vs last month</span>
        </div>
      </div>
      <div className="p-2 bg-raised rounded border border-default text-tertiary">
        {icon}
      </div>
    </div>
  )
}
