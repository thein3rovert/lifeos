import { useState, useEffect, memo } from 'react'
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react'
import { api } from '@/lib/api'
import type { SkillReference } from '@/types'
import { buildTree, type TreeNode } from '@/lib/utils/tree'

type SkillItemProps = {
  skillId: string
  skillTitle: string
  isSelected: boolean
  hasNotes: boolean
  hasPendingSync: boolean
  onSelect: () => void
  onSelectReference?: (reference: SkillReference | null) => void
}

export const SkillItem = memo(function SkillItem({
  skillId,
  skillTitle,
  isSelected,
  hasNotes,
  hasPendingSync,
  onSelect,
  onSelectReference,
}: SkillItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [references, setReferences] = useState<SkillReference[]>([])
  const [tree, setTree] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (expanded && references.length === 0) {
      setLoading(true)
      api.references
        .list(skillId)
        .then((refs) => {
          setReferences(refs)
          setTree(buildTree(refs))
        })
        .catch((err) => console.error('Failed to load references:', err))
        .finally(() => setLoading(false))
    }
  }, [expanded, skillId, references.length])

  return (
    <div className="my-0.5">
      {/* Skill header */}
      <div className="flex items-center px-1">
        {/* Expand/collapse button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded)
          }}
          className="p-1 hover:bg-hover rounded-md transition-colors shrink-0"
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted" strokeWidth={1.5} />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted" strokeWidth={1.5} />
          )}
        </button>

        {/* Skill name */}
        <button
          onClick={() => {
            onSelect()
            if (onSelectReference) {
              onSelectReference(null)
            }
          }}
          className={`
            flex-1 flex items-center gap-2 px-2 py-2 text-left text-base
            transition-all duration-150 rounded-md
            ${
              isSelected
                ? 'text-white border-l-2 border-highlight bg-elevated'
                : 'text-secondary hover:text-white border-l-2 border-transparent hover:bg-hover'
            }
          `}
          style={isSelected ? { boxShadow: 'var(--shadow-neuro-raised)' } : {}}
        >
          <span className="truncate flex-1">{skillTitle}</span>

          <div className="flex items-center gap-1">
            {hasNotes && <span className="w-2 h-2 bg-yellow-600 rounded-full shrink-0" />}
            {hasPendingSync && <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0" />}
          </div>
        </button>
      </div>

      {/* References tree */}
      {expanded && (
        <div className="ml-6 mt-1">
          {loading ? (
            <div className="px-2 py-1 text-xxs text-muted">Loading references...</div>
          ) : tree.length === 0 ? (
            <div className="px-2 py-1 text-xxs text-tertiary">No references</div>
          ) : (
            <TreeView nodes={tree} onSelectFile={onSelectReference} />
          )}
        </div>
      )}
    </div>
  )
})

// Recursive tree view component
function TreeView({ nodes, depth = 0, onSelectFile }: { nodes: TreeNode[]; depth?: number; onSelectFile?: (ref: SkillReference) => void }) {
  return (
    <div>
      {nodes.map((node) => (
        <TreeNodeItem key={node.path} node={node} depth={depth} onSelectFile={onSelectFile} />
      ))}
    </div>
  )
}

function TreeNodeItem({ node, depth, onSelectFile }: { node: TreeNode; depth: number; onSelectFile?: (ref: SkillReference) => void }) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = node.children && node.children.length > 0

  // Strip file extension for display
  const displayName = node.name.replace(/\.md$/, '')

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) {
            setExpanded(!expanded)
          } else if (node.reference && onSelectFile) {
            onSelectFile(node.reference)
          }
        }}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-xxs text-secondary hover:text-white hover:bg-hover rounded-md transition-colors"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <span className="w-3 flex items-center justify-center shrink-0">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="w-3 h-3 text-muted" strokeWidth={1.5} />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted" strokeWidth={1.5} />
            )
          ) : null}
        </span>

        <span className="w-3.5 flex items-center justify-center shrink-0">
          {node.type === 'dir' ? (
            <Folder className="w-3.5 h-3.5 text-highlight" strokeWidth={1.5} />
          ) : (
            <File className="w-3.5 h-3.5 text-tertiary" strokeWidth={1.5} />
          )}
        </span>

        <span className="truncate">{displayName}</span>
      </button>

      {expanded && hasChildren && <TreeView nodes={node.children!} depth={depth + 1} onSelectFile={onSelectFile} />}
    </div>
  )
}