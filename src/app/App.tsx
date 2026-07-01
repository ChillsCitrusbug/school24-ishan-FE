import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthContext'
import { StudentAuthProvider } from '@/features/student-auth/StudentAuthContext'
import { routes } from '@/routes'

const queryClient = new QueryClient()
const router = createBrowserRouter(routes)

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StudentAuthProvider>
          <RouterProvider router={router} />
        </StudentAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
