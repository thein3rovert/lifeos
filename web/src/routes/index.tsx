import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import type { Note, Skill } from '@/types';

export const Route = createFileRoute('/')({
  loader: async () => {
    const [skills, notes] = await Promise.all([api.skills.list(), api.notes.listAll()]);

    // Modified in last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const modifiedRecently = skills.filter((s) => {
      const t = new Date(s.updated_at).getTime();
      return !Number.isNaN(t) && t >= sevenDaysAgo;
    }).length;

    return {
      skills,
      notes,
      stats: {
        totalSkills: skills.length,
        modifiedSkills: modifiedRecently,
        totalNotes: notes.length,
        skillsTrend: '+0',
        modifiedTrend: '+0',
        notesTrend: '+0',
      },
    };
  },
  pendingComponent: DashboardSkeleton,
  component: DashboardPage,
});

function DashboardPage() {
  const { skills, notes, stats } = Route.useLoaderData();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter notes by search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
    const query = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        (note.title?.toLowerCase().includes(query) ?? false) ||
        note.content.toLowerCase().includes(query) ||
        getSkillTitle(skills, note.skill_id).toLowerCase().includes(query)
    );
  }, [notes, searchQuery, skills]);

  // Column config for the notes table
  const notesColumns = useMemo<DataTableColumn<Note>[]>(
    () => [
      {
        key: 'title',
        header: 'Note Title',
        width: '1fr',
        render: (note) => (
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
        ),
      },
      {
        key: 'skill',
        header: 'Skill',
        width: '1fr',
        render: (note) => (
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="/folder.png"
              alt=""
              aria-hidden="true"
              className="w-5 h-5 brightness-150 shrink-0 object-contain"
            />
            <span
              className="text-xs text-highlight truncate"
              title={getSkillTitle(skills, note.skill_id)}
            >
              {getSkillTitle(skills, note.skill_id)}
            </span>
          </div>
        ),
      },
      {
        key: 'date',
        header: 'Date',
        width: '120px',
        render: (note) => (
          <span className="text-xs text-tertiary">
            {(() => {
              try {
                const dateStr = note.created_at.split(' ')[0];
                const date = new Date(dateStr);
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
              } catch {
                return 'Invalid Date';
              }
            })()}
          </span>
        ),
      },
    ],
    [skills]
  );

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Top row - Stats + Empty placeholder */}
      <div className="flex gap-4">
        {/* Stats cards - compact, side by side */}
        <div className="flex gap-3">
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
        </div>

        {/* Empty placeholder - fills remaining space */}
        <div className="flex-1 border border-default rounded bg-input flex items-center justify-center text-muted text-xs">
          Empty for now
        </div>
      </div>

      {/* Middle row - Notes table + Empty placeholder */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Recent Notes - 2/3 width */}
        <DataTable<Note>
          title="Recent Notes"
          data={filteredNotes}
          loading={false}
          rowKey={(note) => note.id}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search here..."
          onAdd={() => {
            /* TODO: open new note modal */
          }}
          emptyMessage={searchQuery ? 'No notes match your search' : 'No notes yet'}
          columns={notesColumns}
        />

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
  );
}

function getSkillTitle(skills: Skill[], skillId: string): string {
  const skill = skills.find((s) => s.id === skillId);
  return skill?.title || skillId;
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex gap-4">
        <div className="flex gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="flex-1 border border-default rounded bg-input flex items-center justify-center text-muted text-xs">
          Empty for now
        </div>
      </div>
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 border border-default rounded-xl bg-input flex flex-col overflow-hidden">
          <div className="h-10 border-b border-default" />
          <div className="flex-1 p-2 space-y-1">
            <div className="h-10 bg-raised rounded-lg animate-pulse" />
            <div className="h-10 bg-raised rounded-lg animate-pulse" />
            <div className="h-10 bg-raised rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="w-1/3 border border-default rounded bg-input flex items-center justify-center text-muted text-xs">
          Empty for now
        </div>
      </div>
      <div className="h-24 border border-default rounded bg-input flex items-center justify-center text-muted text-xs">
        Empty for now
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
  icon,
}: {
  label: string;
  value: number;
  trend: string;
  icon: string;
}) {
  const isPositive = trend.startsWith('+') && trend !== '+0';

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
  );
}
