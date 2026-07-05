import { apiClient } from '@/api/client'

export interface Student {
  id: string
  student_id: string
  full_name: string
  class_id: string
  is_active: boolean
}

export interface EnrolledStudent extends Student {
  temp_password: string
}

export interface CreateStudentInput {
  full_name: string
  class_id: string
}

export interface UpdateStudentInput {
  full_name: string
  class_id: string
}

export interface StudentCredential {
  student_pk: string
  student_name: string
  class_name: string
  student_id: string
  temp_password: string
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function createStudent(input: CreateStudentInput): Promise<EnrolledStudent> {
  const response = await apiClient.post<Envelope<EnrolledStudent>>('/api/v1/students', input)
  return response.data.data
}

export async function listStudents(): Promise<Student[]> {
  const response = await apiClient.get<Envelope<Student[]>>('/api/v1/students')
  return response.data.data
}

export async function getStudent(studentId: string): Promise<Student> {
  const response = await apiClient.get<Envelope<Student>>(`/api/v1/students/${studentId}`)
  return response.data.data
}

export async function updateStudent(studentId: string, input: UpdateStudentInput): Promise<Student> {
  const response = await apiClient.put<Envelope<Student>>(`/api/v1/students/${studentId}`, input)
  return response.data.data
}

export async function removeStudent(studentId: string): Promise<void> {
  await apiClient.delete<Envelope<null>>(`/api/v1/students/${studentId}`)
}

export async function listCredentials(): Promise<StudentCredential[]> {
  const response = await apiClient.get<Envelope<StudentCredential[]>>('/api/v1/students/credentials')
  return response.data.data
}

export async function exportCredentials(): Promise<Blob> {
  const response = await apiClient.get('/api/v1/students/credentials/export', {
    responseType: 'blob',
  })
  return response.data as Blob
}
