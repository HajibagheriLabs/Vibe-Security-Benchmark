// UsageExample.tsx
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export function UserProfileLoading() {
  return (
    <div className="p-6">
      <LoadingSkeleton
        lines={4}
        showAvatar
        showTitle
        showFooter
        lineHeight={14}
        gap={10}
        ariaLabel="Loading user profile"
      />
    </div>
  );
}

export function ArticleLoading() {
  return (
    <div className="max-w-2xl p-8">
      <LoadingSkeleton
        lines={6}
        showTitle
        lineHeight={18}
        gap={12}
        ariaLabel="Loading article content"
      />
    </div>
  );
}

export function CommentLoading() {
  return (
    <div className="space-y-4 p-4">
      <LoadingSkeleton
        lines={2}
        showAvatar
        showTitle={false}
        lineHeight={12}
        gap={6}
        ariaLabel="Loading comments"
      />
      <LoadingSkeleton
        lines={2}
        showAvatar
        showTitle={false}
        lineHeight={12}
        gap={6}
        ariaLabel="Loading comments"
      />
    </div>
  );
}