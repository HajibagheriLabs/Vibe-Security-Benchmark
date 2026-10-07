import React from 'react';
import {
  Skeleton,
  SkeletonCard,
  SkeletonList,
  SkeletonTable,
  Shimmer,
  ShimmerText,
  ShimmerCard,
} from './Skeleton';

export function SkeletonExamples() {
  return (
    <div className="space-y-12 p-8">
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Basic Skeletons</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">Text (default 3 lines)</h3>
            <Skeleton />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Text (5 lines)</h3>
            <Skeleton lines={5} />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Card variant</h3>
            <Skeleton variant="card" />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Circular variant</h3>
            <Skeleton variant="circular" />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Rectangular variant</h3>
            <Skeleton variant="rectangular" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Skeleton Card</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard hasImage={false} lines={4} />
          <SkeletonCard hasAction={false} />
          <SkeletonCard lines={2} hasImage={true} hasAction={true} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Skeleton List</h2>
        <SkeletonList count={4} lines={2} hasAvatar hasAction />
        <SkeletonList count={3} lines={3} hasAvatar={false} hasAction={true} />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Skeleton Table</h2>
        <SkeletonTable rows={5} columns={4} />
        <SkeletonTable rows={3} columns={6} hasHeader={false} />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Shimmer Animations</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">Default LTR Shimmer</h3>
            <Shimmer className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">RTL Shimmer</h3>
            <Shimmer direction="rtl" className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Fast Shimmer</h3>
            <Shimmer speed="fast" className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Slow Shimmer</h3>
            <Shimmer speed="slow" className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Vertical Shimmer (TTB)</h3>
            <Shimmer direction="ttb" className="h-32 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Shimmer Components</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium mb-2">Shimmer Text</h3>
            <ShimmerText lines={4} />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Shimmer Card</h3>
            <ShimmerCard />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Shimmer Card (no image)</h3>
            <ShimmerCard hasImage={false} lines={4} />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Shimmer Card (no action)</h3>
            <ShimmerCard hasAction={false} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Dark Mode Preview</h2>
        <div className="dark space-y-6 p-6 rounded-lg bg-gray-900">
          <Skeleton lines={3} />
          <SkeletonCard />
          <SkeletonList count={3} />
          <ShimmerCard />
          <ShimmerText lines={3} />
        </div>
      </section>
    </div>
  );
}