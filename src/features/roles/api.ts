import { apiClient } from '@/api/client'

/** Mirrors src/constants/enums.py's PermissionModule exactly. */
export type PermissionModuleValue =
  | 'approval'
  | 'order_management'
  | 'menu_management'
  | 'notification'

export interface ModulePermission {
  module: PermissionModuleValue
  can_add: boolean
  can_edit: boolean
  can_delete: boolean
  can_list: boolean
}

export interface Role {
  id: string
  name: string
  staff_count: number
  permissions: ModulePermission[]
}

export interface ModulePermissionInput {
  module: PermissionModuleValue
  can_add?: boolean
  can_edit?: boolean
  can_delete?: boolean
  can_list?: boolean
}

interface Envelope<T> {
  data: T
  meta: unknown
  errors: unknown
}

export async function listRoles(): Promise<Role[]> {
  const response = await apiClient.get<Envelope<Role[]>>('/api/v1/roles')
  return response.data.data
}

export async function createRole(
  name: string,
  permissions: ModulePermissionInput[],
): Promise<Role> {
  const response = await apiClient.post<Envelope<Role>>('/api/v1/roles', { name, permissions })
  return response.data.data
}

export async function getRole(roleId: string): Promise<Role> {
  const response = await apiClient.get<Envelope<Role>>(`/api/v1/roles/${roleId}`)
  return response.data.data
}

export async function updateRole(
  roleId: string,
  name: string,
  permissions: ModulePermissionInput[],
): Promise<Role> {
  const response = await apiClient.put<Envelope<Role>>(`/api/v1/roles/${roleId}`, {
    name,
    permissions,
  })
  return response.data.data
}

export async function deleteRole(roleId: string): Promise<void> {
  await apiClient.delete(`/api/v1/roles/${roleId}`)
}
