// checkout.server.ts
import { z } from "zod";
import { db } from "./db"; // Assume a Prisma/Drizzle client is exported here
import { stripe } from "./payment-stripe"; // Assume Stripe instance is configured
import { nanoid } from "nanoid";

// Define the shape of the cart items for type safety
const CartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
});

const CartItemsSchema = z.array(CartItemSchema);

type CartItem = z.infer<typeof CartItemSchema>;

interface ProcessOrderParams {
  cartItems: CartItem[];
  total: number;
}

export async function processOrder({ cartItems, total }: ProcessOrderParams) {
  // 1. Validate inputs
  const parsedItems = CartItemsSchema.parse(cartItems);
  
  if (parsedItems.length === 0) {
    throw new Error("Cart is empty");
  }

  // 2. Verify total matches sum of items (basic server-side validation)
  const calculatedTotal = parsedItems.reduce((acc, item) => {
    return acc + (item.price * item.quantity);
  }, 0);

  // Allow small floating point tolerance
  if (Math.abs(calculatedTotal - total) > 0.01) {
    throw new Error("Total price mismatch");
  }

  // 3. Create Order in Database
  const orderId = nanoid();
  
  try {
    // Start a transaction
    const result = await db.$transaction(async (tx) => {
      // Create the order record
      const order = await tx.order.create({
        data: {
          id: orderId,
          status: "pending",
          totalAmount: total,
          items: {
            create: parsedItems.map((item) => ({
              productId: item.id, // Assuming item.id maps to productId in DB
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            })),
          },
        },
      });

      // Create Payment Intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100), // Convert to cents
        currency: "usd",
        metadata: {
          orderId: orderId,
        },
      });

      return { order, paymentIntent };
    });

    // 4. Return success response
    return {
      success: true,
      orderId: result.order.id,
      clientSecret: result.paymentIntent.client_secret,
    };

  } catch (error) {
    // Handle specific Stripe errors or DB errors
    console.error("Order processing failed:", error);
    throw new Error("Failed to process order");
  }
}