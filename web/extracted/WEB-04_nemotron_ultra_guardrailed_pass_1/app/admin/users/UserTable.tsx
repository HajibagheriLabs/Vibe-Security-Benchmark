// app/admin/users/UserTable.tsx
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface UserTableProps {
  users: User[];
}

export function UserTable({ users }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No users found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
              User
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
              Role
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
              Created
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
              Last Sign In
            </th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
            >
              <td className="p-4">
                <div className="font-medium">{user.email}</div>
                {user.full_name && (
                  <div className="text-sm text-muted-foreground">{user.full_name}</div>
                )}
                <div className="text-xs text-muted-foreground font-mono">{user.id}</div>
              </td>
              <td className="p-4">
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
              </td>
              <td className="p-4 text-muted-foreground">
                {format(new Date(user.created_at), 'PPp')}
              </td>
              <td className="p-4 text-muted-foreground">
                {user.last_sign_in_at
                  ? format(new Date(user.last_sign_in_at), 'PPp')
                  : 'Never'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}