import PaymentInitiation from '@/components/PaymentInitiation';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Complete Your Purchase
        </h1>
        <PaymentInitiation
          priceId="price_1234567890"
          quantity={1}
          buttonLabel="Checkout with Stripe"
        />
      </div>
    </main>
  );
}