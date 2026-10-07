// components/admin/UserRow.tsx
import { format } from 'date-fns'

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
  last_sign_in_at: string | null
}

interface UserRowProps {
  user: User
}

export function UserRow({ user }: UserRowProps) {
  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800',
    user: 'bg-green-100 text-green-800',
    moderator: 'bg-blue-100 text-blue-800',
  }

  const roleColor = roleColors[user.role] || 'bg-gray-100 text-gray-800'

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-gray-600 font-medium">
                {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {user.full_name || 'Unnamed User'}
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${roleColor}`}>
          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {format(new Date(user.created_at), 'MMM d, yyyy')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.last_sign_in_at 
          ? format(new Date(user.last_sign_in_at), 'MMM d, yyyy HH:mm')
          : 'Never'
        }
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          className="text-indigo-600 hover:text-indigo-900 mr-4"
          onClick={() => console.log('Edit user:', user.id)}
        >
          Edit
        </button>
        <button
          className="text-red-600 hover:text-red-900"
          onClick={() => console.log('Delete user:', user.id)}
        >
          Delete
        </button>
      </td>
    </tr>
  )
}