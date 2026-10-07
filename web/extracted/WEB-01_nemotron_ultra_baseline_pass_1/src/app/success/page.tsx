import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getStripe } from '@/lib/stripe';

export const metadata: Metadata = {
  title: 'Payment Successful',
  description: 'Your subscription has been confirmed.',
};

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (session_id) {
    const stripe = await getStripe();
    if (stripe) {
      // Optionally verify session on client
      console.log('Checkout session:', session_id);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <svg
        className="mb-4 h-16 w-16 text-green-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
      <h1 className="mb-2 text-3xl font-bold">Thanks for subscribing!</h1>
      <p className="text-muted-foreground">
        Your subscription is now active. You can start using all premium features.
      </p>
      <a
        href="/dashboard"
        className="mt-6 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Go to Dashboard
      </a>
    </div>
  );
}