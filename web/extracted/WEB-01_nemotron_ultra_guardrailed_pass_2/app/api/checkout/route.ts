import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { createCheckoutSession } from "@/app/lib/stripe";
import { z } from "zod";

const bodySchema = z.object({
  priceId: z.string().min(1, "priceId is required"),
  mode: z.enum(["payment", "subscription"]).default("payment"),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  try {
    const result = await createCheckoutSession({
      userId: session.user.id,
      priceId: parsed.priceId,
      mode: parsed.mode,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error({ event: "checkout_create_failed", userId: session.user.id, err });
    return NextResponse.json(
      { error: "Unable to start checkout" },
      { status: 500 }
    );
  }
}