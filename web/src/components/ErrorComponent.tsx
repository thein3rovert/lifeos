export default function ErrorComponent({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <h1 className="text-lg font-semibold text-white mb-2">Something went wrong</h1>
      <p className="text-[#777] text-xs mb-4">{error.message}</p>
      <button 
        onClick={() => window.location.reload()}
        className="h-7 px-3 bg-[#ededed] hover:bg-white text-black text-xs font-medium rounded transition-colors"
      >
        Reload page
      </button>
    </div>
  )
}