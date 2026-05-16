import type { SkillReference } from '@/types'

export type TreeNode = {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: TreeNode[]
  reference?: SkillReference
}

/**
 * Builds a tree structure from flat list of references
 * @param references Flat array of skill references
 * @returns Root tree node with nested children
 */
export function buildTree(references: SkillReference[]): TreeNode[] {
  const root: TreeNode[] = []
  const nodeMap = new Map<string, TreeNode>()

  // Sort by path to ensure parent folders are created first
  const sorted = [...references].sort((a, b) => a.path.localeCompare(b.path))

  for (const ref of sorted) {
    const parts = ref.path.split('/')
    const fileName = parts[parts.length - 1]

    const node: TreeNode = {
      name: fileName,
      path: ref.path,
      type: ref.type,
      children: ref.type === 'dir' ? [] : undefined,
      reference: ref,
    }

    nodeMap.set(ref.path, node)

    // If it's a top-level item (no parent path)
    if (parts.length === 1) {
      root.push(node)
    } else {
      // Find parent path
      const parentPath = parts.slice(0, -1).join('/')
      const parent = nodeMap.get(parentPath)

      if (parent && parent.children) {
        parent.children.push(node)
      } else {
        // Parent doesn't exist yet, add to root
        root.push(node)
      }
    }
  }

  return root
}
