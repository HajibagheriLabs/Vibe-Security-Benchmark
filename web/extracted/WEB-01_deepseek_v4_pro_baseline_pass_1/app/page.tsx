import PaymentButton from '@/components/PaymentButton';
import PaymentForm from '@/components/PaymentForm';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-3xl font-bold text-gray-900">Stripe Checkout Demo</h1>

      <div className="flex flex-col gap-8 w-full max-w-md">
        {/* Simple payment button */}
        <section className="rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Single Item Checkout
          </h2>
          <PaymentButton
            priceId="price_1234567890"
            buttonText="Checkout - $19.99"
          />
        </section>

        {/* Payment form with quantity selector */}
        <section className="rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Quantity Checkout
          </h2>
          <PaymentForm
            priceId="price_1234567890"
            allowQuantity
            minQuantity={1}
            maxQuantity={5}
          />
        </section>
      </div>
    </main>
  );
}