import { Search, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { SkeletonTableRow } from './Skeleton'

export type DataTableColumn<T> = {
  /** Unique key for this column (used as React key) */
  key: string
  /** Header label */
  header: string
  /** CSS grid track size (e.g. '1fr', '120px', 'minmax(0, 2fr)') */
  width?: string
  /** Custom renderer for the cell */
  render: (row: T) => ReactNode
}

type DataTableProps<T> = {
  /** Card header title */
  title: string
  /** Items to render */
  data: T[]
  /** Column configuration */
  columns: DataTableColumn<T>[]
  /** Stable key for each row */
  rowKey: (row: T) => string | number
  /** Loading state — shows skeleton rows */
  loading?: boolean
  /** Number of skeleton rows to show while loading (default 3) */
  skeletonRows?: number
  /** Message when data is empty */
  emptyMessage?: string
  /** Search input value */
  searchValue?: string
  /** Search input handler. If unset, search box is hidden */
  onSearchChange?: (value: string) => void
  /** Search placeholder */
  searchPlaceholder?: string
  /** Add button click handler. If unset, button is hidden */
  onAdd?: () => void
  /** Row click handler */
  onRowClick?: (row: T) => void
}

export function DataTable<T>({
  title,
  data,
  columns,
  rowKey,
  loading = false,
  skeletonRows = 3,
  emptyMessage = 'No items',
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search here...',
  onAdd,
  onRowClick,
}: DataTableProps<T>) {
  const gridTemplate = columns.map((c) => c.width ?? '1fr').join(' ')

  return (
    <div className="flex-1 border border-default rounded-xl bg-input flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-default">
        <span className="text-sm font-semibold text-white">{title}</span>
        {(onSearchChange || onAdd) && (
          <div className="flex items-center gap-2">
            {onSearchChange && (
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted"
                  strokeWidth={1.5}
                />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue ?? ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="h-7 pl-8 pr-3 text-xs bg-raised border border-default rounded-md text-secondary placeholder:text-muted focus:outline-none focus:border-strong w-44"
                />
              </div>
            )}
            {onAdd && (
              <button
                onClick={onAdd}
                className="h-7 px-2 flex items-center justify-center bg-accent-primary hover:brightness-95 text-black rounded-md transition-colors duration-150"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Column headers */}
      <div
        className="grid gap-4 px-4 py-2 text-[10px] uppercase tracking-wider text-tertiary"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {columns.map((c) => (
          <span key={c.key}>{c.header}</span>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-2 pb-2 space-y-1">
        {loading ? (
          Array.from({ length: skeletonRows }).map((_, i) => <SkeletonTableRow key={i} />)
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted text-xs">
            {emptyMessage}
          </div>
        ) : (
          data.map((row) => (
            <div
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`grid gap-4 items-center px-3 py-2.5 rounded-lg bg-raised hover:bg-hover transition-colors duration-150 ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {columns.map((c) => (
                <div key={c.key} className="min-w-0">
                  {c.render(row)}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
