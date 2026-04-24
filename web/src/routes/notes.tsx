import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/notes')({
  component: NotesPage,
})

function NotesPage() {
  return (
    <div className="flex items-center justify-center h-full text-[#585858]">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-white mb-2">Notes</h1>
        <p className="text-sm">Notes page coming soon...</p>
      </div>
    </div>
  )
}