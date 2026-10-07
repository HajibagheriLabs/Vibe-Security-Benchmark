// app/admin/users/UserTableSkeleton.tsx
export function UserTableSkeleton() {
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
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <td className="p-4">
                <div className="h-4 w-48 animate-pulse bg-muted rounded" />
                <div className="h-3 w-32 animate-pulse bg-muted rounded mt-2" />
                <div className="h-3 w-24 animate-pulse bg-muted rounded mt-1" />
              </td>
              <td className="p-4">
                <div className="h-5 w-20 animate-pulse bg-muted rounded" />
              </td>
              <td className="p-4">
                <div className="h-4 w-32 animate-pulse bg-muted rounded" />
              </td>
              <td className="p-4">
                <div className="h-4 w-32 animate-pulse bg-muted rounded" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}