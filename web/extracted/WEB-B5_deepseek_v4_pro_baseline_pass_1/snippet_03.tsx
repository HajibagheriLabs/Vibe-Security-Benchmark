import Skeleton from './Skeleton';
import './shimmer.css';

function App() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Basic usage */}
      <Skeleton lines={4} />

      {/* With avatar and custom styling */}
      <Skeleton
        lines={3}
        lineHeight={14}
        gap={8}
        showAvatar
        className="mt-8"
        lineClassName="rounded-full"
      />
    </div>
  );
}