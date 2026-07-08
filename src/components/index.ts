// Barrel for the shared component library, reused from the approved DESIGN repo
// (school24-DESIGN/src/components). Mirrors school24-DESIGN/src/components/index.ts
// export-for-export; only the underlying paths differ (atoms/molecules/organisms/layout
// per agents/frontend.md's atomic-design classification).

// Atoms
export { Icon, type IconName } from './atoms/Icon'
export { Spinner } from './atoms/Spinner'
export { Avatar } from './atoms/Avatar'
export { Badge, type Tone } from './atoms/Badge'
export { StatusPill, type StatusTone } from './atoms/StatusPill'
export { Card, CardHeader } from './atoms/Card'
export { Toggle } from './atoms/Toggle'
export { SegmentedControl, type Segment } from './atoms/SegmentedControl'
export { Pagination } from './atoms/Pagination'
export { Skeleton } from './atoms/Skeleton'
export { QuickAmounts } from './atoms/QuickAmounts'

// Molecules
export { Button, type ButtonProps } from './molecules/Button'
export { IconButton } from './molecules/IconButton'
export { Input } from './molecules/Input'
export { Select, type SelectProps } from './molecules/Select'
export { Checkbox } from './molecules/Checkbox'
export { InfoRow, SettingRow } from './molecules/ProfileRow'
export { StatCard } from './molecules/StatCard'
export { EmptyState } from './molecules/EmptyState'
export { ErrorState } from './molecules/ErrorState'
export { Dialog } from './molecules/Dialog'
export { ActionTile } from './molecules/ActionTile'
export { BalanceHero } from './molecules/BalanceHero'
export { ResultHero } from './molecules/ResultHero'
export { QtyStepper } from './molecules/QtyStepper'
export { OrderTimeline, type TimelineStep } from './molecules/OrderTimeline'
export { Field } from './molecules/Field'
export { Banner } from './molecules/Banner'

// App-local addition (no design-repo equivalent — the mock's own date-range
// button was never given a real interaction; see the component's own docstring).
export { DateRangeButton } from './molecules/DateRangeButton'

// Organisms
export { ChildCard, type ChildCardProps } from './organisms/ChildCard'
export { FoodItemCard, type FoodItemCardProps } from './organisms/FoodItemCard'
export { MenuCard, type MenuCardProps } from './organisms/MenuCard'
export { OrderQueueCard, type OrderQueueCardProps } from './organisms/OrderQueueCard'
export { AuthLayout } from './organisms/AuthLayout'
export { SystemPage } from './organisms/SystemPage'

// Organisms — charts
export { BarChart, type BarSeries, type BarGroup } from './organisms/charts/BarChart'
export { DonutChart, type DonutSegment } from './organisms/charts/DonutChart'

// Organisms — table
export { DataTable, type Column } from './organisms/table/DataTable'

// Layout
export { AppShell } from './layout/AppShell'
export { Sidebar, type NavItem, type NavGroup, type SidebarUser } from './layout/Sidebar'
export { Topbar } from './layout/Topbar'
export { MobileTabBar, type TabItem } from './layout/MobileTabBar'
