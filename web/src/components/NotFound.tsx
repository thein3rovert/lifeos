import { Link } from '@tanstack/react-router'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-2xl font-semibold text-white mb-2">Page not found</h1>
      <p className="text-tertiary text-sm mb-4">The page you're looking for doesn't exist.</p>
      <Link
        to="/"
        className="text-highlight hover:underline text-sm"
      >
        Go back home
      </Link>
    </div>
  )
}
