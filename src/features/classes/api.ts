import { apiClient } from '@/api/client'

export interface SchoolClass {
  id: string
  label: string
  student_count: number
}

export interface EnrolledStudent {
  id: string
  student_id: string
  full_name: string
}

export interface CreateClassInput {
  label: string
}

export interface UpdateClassInput {
  label: string
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function createClass(input: CreateClassInput): Promise<SchoolClass> {
  const response = await apiClient.post<Envelope<SchoolClass>>('/api/v1/classes', input)
  return response.data.data
}

export async function listClasses(): Promise<SchoolClass[]> {
  const response = await apiClient.get<Envelope<SchoolClass[]>>('/api/v1/classes')
  return response.data.data
}

export async function getClass(classId: string): Promise<SchoolClass> {
  const response = await apiClient.get<Envelope<SchoolClass>>(`/api/v1/classes/${classId}`)
  return response.data.data
}

export async function updateClass(classId: string, input: UpdateClassInput): Promise<SchoolClass> {
  const response = await apiClient.put<Envelope<SchoolClass>>(`/api/v1/classes/${classId}`, input)
  return response.data.data
}

export async function deleteClass(classId: string): Promise<void> {
  await apiClient.delete<Envelope<null>>(`/api/v1/classes/${classId}`)
}

export async function listStudentsInClass(classId: string): Promise<EnrolledStudent[]> {
  const response = await apiClient.get<Envelope<EnrolledStudent[]>>(
    `/api/v1/classes/${classId}/students`,
  )
  return response.data.data
}
