import type { ReactNode } from 'react'
import { Icon, type IconName } from '../atoms/Icon'

/** A label / value row inside a profile account card. */
export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  )
}

/** A settings row — icon + title/desc + an action on the right. */
export function SettingRow({
  icon,
  title,
  desc,
  action,
}: {
  icon: IconName
  title: string
  desc: string
  action: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-mint text-brand">
        <Icon name={icon} className="h-5 w-5" strokeWidth={1.7} />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{title}</div>
        <div className="text-xs text-muted">{desc}</div>
      </div>
      <div className="ml-auto">{action}</div>
    </div>
  )
}
