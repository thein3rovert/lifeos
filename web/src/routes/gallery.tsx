import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/gallery')({
  component: GalleryPage,
})

function GalleryPage() {
  return (
    <div className="flex items-center justify-center h-full text-[#585858]">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-white mb-2">Gallery</h1>
        <p className="text-sm">Photo gallery coming soon...</p>
      </div>
    </div>
  )
}