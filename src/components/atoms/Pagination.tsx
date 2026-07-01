import { cn } from '@/lib/cn'

export function Pagination({
  summary,
  page,
  pageCount,
  onPage,
  className,
}: {
  summary: string
  page: number
  pageCount: number
  onPage?: (page: number) => void
  className?: string
}) {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1)
  return (
    <div className={cn('flex items-center justify-between gap-3 text-sm', className)}>
      <span className="text-muted">{summary}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage?.(page - 1)}
          disabled={page <= 1}
          className="rounded-control border border-line bg-white px-3 py-1.5 text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPage?.(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-control text-sm',
              p === page ? 'bg-brand font-medium text-white' : 'border border-line text-ink hover:bg-canvas',
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPage?.(page + 1)}
          disabled={page >= pageCount}
          className="rounded-control border border-line bg-white px-3 py-1.5 text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
