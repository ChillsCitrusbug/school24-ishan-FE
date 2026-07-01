import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { routes } from '@/routes'

/**
 * App shell placeholder — provider wiring only, no business UI.
 * Each ticket's UI mounts under the route table in src/routes/.
 */
const queryClient = new QueryClient()
const router = createBrowserRouter(routes)

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
