type AccentStripesColor = 'red' | 'yellow' | 'green' | 'blue' | 'gray'

type AccentStripesProps = {
  color?: AccentStripesColor | string
  className?: string
}

// Color presets matching Atlas palette
const colorPresets: Record<AccentStripesColor, string> = {
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  gray: '#6b7280',
}

/**
 * AccentStripes - decorative 4-stripe indicator used in panel headers.
 * The last stripe is intentionally wider for a trailing accent effect.
 *
 * Accepts a preset color name or any custom hex/CSS color string.
 */
export function AccentStripes({ color = 'gray', className }: AccentStripesProps) {
  const fill =
    (color as string) in colorPresets
      ? colorPresets[color as AccentStripesColor]
      : (color as string)

  return (
    <svg
      width="56"
      height="10"
      viewBox="0 0 56 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="0" width="7" height="10" transform="skewX(-25)" fill={fill} />
      <rect x="12" y="0" width="7" height="10" transform="skewX(-25)" fill={fill} />
      <rect x="22" y="0" width="7" height="10" transform="skewX(-25)" fill={fill} />
      <rect x="32" y="0" width="26" height="10" transform="skewX(-25)" fill={fill} />
    </svg>
  )
}
