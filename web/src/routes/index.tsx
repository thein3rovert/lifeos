import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Search,
  Plus
} from 'lucide-react'
import { api } from '@/lib/api'
import { SkeletonCard, SkeletonTableRow } from '@/components/ui/Skeleton'
import type { Note, Skill } from '@/types'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

async function fetchStats() {
  const [skills, notes] = await Promise.all([
    api.skills.list(),
    api.notes.listAll(),
  ])

  // Modified in last 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const modifiedRecently = skills.filter((s) => {
    const t = new Date(s.updated_at).getTime()
    return !isNaN(t) && t >= sevenDaysAgo
  }).length

  return {
    totalSkills: skills.length,
    modifiedSkills: modifiedRecently,
    totalNotes: notes.length,
    skillsTrend: '+0',
    modifiedTrend: '+0',
    notesTrend: '+0',
  }
}

async function fetchNotes() {
  return api.notes.listAll()
}

function DashboardPage() {
  const [stats, setStats] = useState({
    totalSkills: 0,
    modifiedSkills: 0,
    totalNotes: 0,
    skillsTrend: '+0',
    modifiedTrend: '+0',
    notesTrend: '+0',
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
  const getSkillTitle = useCallback((skillId: string) => {
    const skill = skills.find(s => s.id === skillId)
    return skill?.title || skillId
  }, [skills])

  // Filter notes by search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes
    const query = searchQuery.toLowerCase()
    return notes.filter(note =>
      (note.title?.toLowerCase().includes(query) ?? false) ||
      note.content.toLowerCase().includes(query) ||
      getSkillTitle(note.skill_id).toLowerCase().includes(query)
    )
  }, [notes, searchQuery, getSkillTitle])

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Top row - Stats + Empty placeholder */}
      <div className="flex gap-4">
        {/* Stats cards - compact, side by side */}
        <div className="flex gap-3">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <StatCard
                label="Total Skills"
                value={stats.totalSkills}
                trend={stats.skillsTrend}
                icon="/folder.png"
              />
              <StatCard
                label="Skills Modified"
                value={stats.modifiedSkills}
                trend={stats.modifiedTrend}
                icon="/folder.png"
              />
              <StatCard
                label="Total Notes"
                value={stats.totalNotes}
                trend={stats.notesTrend}
                icon="/note.png"
              />
            </>
          )}
        </div>

        {/* Empty placeholder - fills remaining space */}
        <div className="flex-1 border border-default rounded bg-input flex items-center justify-center text-muted text-xs">
          Empty for now
        </div>
      </div>

      {/* Middle row - Notes table + Empty placeholder */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Recent Notes - 2/3 width */}
        <div className="flex-1 border border-default rounded-xl bg-input flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-default">
            <span className="text-sm font-semibold text-white">Recent Notes</span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Search here..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 pl-8 pr-3 text-xs bg-raised border border-default rounded-md text-secondary placeholder:text-muted focus:outline-none focus:border-strong w-44"
                />
              </div>
              <button className="h-7 px-2 flex items-center justify-center bg-accent-primary hover:brightness-95 text-black rounded-md transition-colors duration-150">
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_120px] gap-4 px-4 py-2 text-[10px] uppercase tracking-wider text-tertiary">
            <span>Note Title</span>
            <span>Skill</span>
            <span>Date</span>
          </div>

          {/* Table body */}
          <div className="flex-1 overflow-auto px-2 pb-2 space-y-1">
            {loading ? (
              <>
                <SkeletonTableRow />
                <SkeletonTableRow />
                <SkeletonTableRow />
              </>
            ) : filteredNotes.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted text-xs">
                {searchQuery ? 'No notes match your search' : 'No notes yet'}
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="grid grid-cols-[1fr_1fr_120px] gap-4 items-center px-3 py-2.5 rounded-lg bg-raised hover:bg-hover transition-colors duration-150 cursor-pointer"
                >
                  {/* Title with note icon */}
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src="/note.png"
                      alt=""
                      aria-hidden="true"
                      className="w-5 h-5 brightness-150 shrink-0 object-contain"
                    />
                    <span className="text-xs text-secondary truncate" title={note.title || note.content}>
                      {note.title || note.content}
                    </span>
                  </div>

                  {/* Skill with folder icon */}
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src="/folder.png"
                      alt=""
                      aria-hidden="true"
                      className="w-5 h-5 brightness-150 shrink-0 object-contain"
                    />
                    <span className="text-xs text-highlight truncate" title={getSkillTitle(note.skill_id)}>
                      {getSkillTitle(note.skill_id)}
                    </span>
                  </div>

                  {/* Date */}
                  <span className="text-xs text-tertiary">
                    {(() => {
                      try {
                        const dateStr = note.created_at.split(' ')[0]
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
}: {
  label: string
  value: number
  trend: string
  icon: string
}) {
  const isPositive = trend.startsWith('+') && trend !== '+0'

  return (
    <div className="relative overflow-hidden rounded-xl border border-default bg-gradient-to-br from-raised to-input p-4 transition-all duration-200 hover:border-strong hover:shadow-lg group w-72">
      {/* Decorative icon - right side, fully visible */}
      <img
        src={icon}
        alt=""
        aria-hidden="true"
        className="absolute right-2 top-1/2 -translate-y-1/2 w-24 h-24 opacity-90 brightness-150 group-hover:brightness-200 transition-all duration-200 pointer-events-none select-none object-contain"
      />

      {/* Content */}
      <div className="relative space-y-2.0 pr-25">
        <span className="text-xs font-medium text-tertiary whitespace-nowrap">{label}</span>
        <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
        <div className="text-[11px] font-medium">
          <span className={isPositive ? 'text-success' : 'text-muted'}>{trend}</span>
          <span className="text-muted ml-1">vs last month</span>
        </div>
      </div>
    </div>
  )
}
