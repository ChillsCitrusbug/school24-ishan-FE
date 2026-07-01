import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface Column<T> {
  key: string
  header: ReactNode
  align?: 'left' | 'right' | 'center'
  cell: (row: T) => ReactNode
  thClassName?: string
  tdClassName?: string
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const

/** Generic, presentational data table. Columns define how each cell renders. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string | number
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            {columns.map((c) => (
              <th key={c.key} className={cn('px-3 py-2.5 font-medium first:pl-5 last:pr-5', ALIGN[c.align ?? 'left'], c.thClassName)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)} className="transition-colors hover:bg-canvas">
              {columns.map((c) => (
                <td key={c.key} className={cn('px-3 py-3 first:pl-5 last:pr-5', ALIGN[c.align ?? 'left'], c.tdClassName)}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
