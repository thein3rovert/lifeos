// Utility functions for skills feature

/**
 * Strips YAML frontmatter from markdown content
 */
export function stripFrontmatter(content: string): string {
  if (!content.startsWith('---')) {
    return content
  }

  const lines = content.split('\n')
  let contentStart = 0

  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      contentStart = i + 1
      break
    }
  }

  if (contentStart > 0 && contentStart < lines.length) {
    return lines.slice(contentStart).join('\n').trim()
  }

  return content
}

/**
 * Formats a date string from Go backend to human-readable format
 */
export function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === '0001-01-01T00:00:00Z' || dateStr.startsWith('0001-01-01')) {
    return 'Unknown date'
  }

  // Handle Go time format: "2026-04-24 22:34:14.340107457 +0100 BST"
  const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
  if (dateMatch) {
    const date = new Date(dateMatch[1])
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }
  }

  // Fallback: try parsing the whole string
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return 'Unknown date'
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
