import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { 
  TrendingUp,
  Image as ImageIcon,
  BookOpen,
  Search,
  Plus
} from 'lucide-react'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

const API_URL = 'http://100.105.217.77:6060'

async function fetchStats() {
  const [skillsRes, photosRes] = await Promise.all([
    fetch(`${API_URL}/api/skills`),
    fetch(`${API_URL}/api/photos`)
  ])
  
  const skills = await skillsRes.json()
  const photos = await photosRes.json()
  
  return {
    totalSkills: skills.length,
    totalPhotos: photos.length,
    skillsTrend: '+5',
    photosTrend: '+12'
  }
}

function DashboardPage() {
  const [stats, setStats] = useState({
    totalSkills: 0,
    totalPhotos: 0,
    skillsTrend: '+0',
    photosTrend: '+0'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

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
        <div className="w-1/3 border border-[#1e1e1e] rounded bg-[#0a0a0a] flex items-center justify-center text-[#585858] text-xs">
          Empty for now
        </div>
      </div>

      {/* Middle row - Notes table + Empty placeholder */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Today's Notes - 2/3 width */}
        <div className="flex-1 border border-[#1e1e1e] rounded bg-[#0a0a0a] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e1e1e]">
            <span className="text-xs font-medium text-[#aaa]">Today's Notes</span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#585858]" strokeWidth={1.5} />
                <input 
                  type="text" 
                  placeholder="Search notes..."
                  className="h-6 pl-7 pr-2 text-xs bg-black border border-[#1e1e1e] rounded text-[#aaa] placeholder:text-[#585858] focus:outline-none focus:border-[#3d3d3d] w-40"
                />
              </div>
              <button className="h-6 px-2 flex items-center justify-center bg-[#ededed] hover:bg-white text-black rounded transition-colors duration-150">
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
          
          {/* Table header */}
          <div className="grid grid-cols-4 px-3 py-1.5 border-b border-[#1e1e1e] text-[10px] uppercase tracking-wider text-[#777]">
            <span>Note description</span>
            <span>Skills</span>
            <span>Tags</span>
            <span>Date</span>
          </div>
          
          {/* Table body - placeholder rows */}
          <div className="flex-1 overflow-auto">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="grid grid-cols-4 px-3 py-2 border-b border-[#141414] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150"
              >
                <span className="text-xs text-[#aaa]">Note {i} description here</span>
                <span className="text-xs text-[#777]">Skill name</span>
                <span className="text-xs text-[#777]">tag</span>
                <span className="text-xs text-[#777]">Jan {i}, 2025</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Empty placeholder - 1/3 width */}
        <div className="w-1/3 border border-[#1e1e1e] rounded bg-[#0a0a0a] flex items-center justify-center text-[#585858] text-xs">
          Empty for now
        </div>
      </div>

      {/* Bottom row - Empty placeholder */}
      <div className="h-24 border border-[#1e1e1e] rounded bg-[#0a0a0a] flex items-center justify-center text-[#585858] text-xs">
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
    <div className="border border-[#1e1e1e] rounded bg-[#0a0a0a] p-4 flex items-start justify-between">
      <div className="space-y-1">
        <span className="text-[11px] text-[#777] uppercase tracking-wide">{label}</span>
        <div className="text-3xl font-semibold text-white">
          {loading ? '-' : value}
        </div>
        <div className="flex items-center gap-1 text-xs">
          <TrendingUp className="w-3 h-3 text-[#4d4d4d]" strokeWidth={1.5} />
          <span className="text-[#4d4d4d]">{trend} vs last month</span>
        </div>
      </div>
      <div className="p-2 bg-[#0f0f0f] rounded border border-[#1e1e1e] text-[#777]">
        {icon}
      </div>
    </div>
  )
}