'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export type UserRow = {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'user' | 'moderator'
  status: 'active' | 'suspended' | 'pending'
  created_at: string
  last_sign_in_at: string | null
  avatar_url: string | null
}

type UsersTableProps = {
  users: UserRow[]
}

export function UsersTable({ users }: UsersTableProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRoleChange = async (userId: string, newRole: UserRow['role']) => {
    setUpdatingId(userId)
    setError(null)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (updateError) {
      setError(updateError.message)
    } else {
      router.refresh()
    }

    setUpdatingId(null)
  }

  const handleStatusChange = async (
    userId: string,
    newStatus: UserRow['status']
  ) => {
    setUpdatingId(userId)
    setError(null)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', userId)

    if (updateError) {
      setError(updateError.message)
    } else {
      router.refresh()
    }

    setUpdatingId(null)
  }

  const roleBadgeClasses: Record<UserRow['role'], string> = {
    admin: 'bg-purple-100 text-purple-700 ring-purple-600/20',
    moderator: 'bg-blue-100 text-blue-700 ring-blue-600/20',
    user: 'bg-gray-100 text-gray-700 ring-gray-600/20',
  }

  const statusBadgeClasses: Record<UserRow['status'], string> = {
    active: 'bg-green-100 text-green-700 ring-green-600/20',
    suspended: 'bg-red-100 text-red-700 ring-red-600/20',
    pending: 'bg-yellow-100 text-yellow-700 ring-yellow-600/20',
  }

  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-sm text-gray-500">No users found.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                User
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                Role
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                Created
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                Last Sign In
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatar_url}
                        alt={user.full_name ?? user.email}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                        {(user.full_name ?? user.email)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.full_name ?? '—'}
                      </div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>

                <td className="whitespace-nowrap px-6 py-4">
                  <select
                    value={user.role}
                    disabled={updatingId === user.id}
                    onChange={(e) =>
                      handleRoleChange(
                        user.id,
                        e.target.value as UserRow['role']
                      )
                    }
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>

                <td className="whitespace-nowrap px-6 py-4">
                  <select
                    value={user.status}
                    disabled={updatingId === user.id}
                    onChange={(e) =>
                      handleStatusChange(
                        user.id,
                        e.target.value as UserRow['status']
                      )
                    }
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>

                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString()
                    : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}