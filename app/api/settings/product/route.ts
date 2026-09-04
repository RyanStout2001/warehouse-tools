import { NextResponse } from "next/server";
import {
  findProductByCode,
  parseFlagOverride,
  parseVelocityOverride,
  upsertProductSettings,
} from "@/lib/data/settings";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const productcode =
      typeof body.productcode === "string" ? body.productcode.trim() : "";
    if (!productcode) {
      throw new Error("productcode is required");
    }
    const product = await findProductByCode(productcode);
    if (!product) {
      throw new Error(`No product found for code ${productcode}`);
    }
    const input = {
      ...parseVelocityOverride(body),
      ...parseFlagOverride(body),
    };
    const settings = await upsertProductSettings(product.id, input);
    return NextResponse.json({
      ok: true as const,
      product,
      settings,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save product settings";
    return NextResponse.json(
      { ok: false as const, error: message },
      { status: 400 },
    );
  }
}
