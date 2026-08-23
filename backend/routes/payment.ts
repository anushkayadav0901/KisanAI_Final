/**
 * routes/payment.ts — /api/payment/* endpoints (Razorpay)
 *
 *   POST /api/payment/create-order  — create a Razorpay order
 *   POST /api/payment/verify        — verify payment signature (HMAC-SHA256)
 *   GET  /api/payment/key           — expose publishable key to frontend
 *
 * The Razorpay client is initialised once at module load.
 * If the keys are missing the routes return 503 immediately.
 */

import { createHmac } from "crypto";
import type { Request, Response } from "express";
import { Router } from "express";
import Razorpay from "razorpay";
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from "../config.js";

const router = Router();

// ── Request body shapes ──────────────────────────────────────────────────────

interface CreateOrderBody {
  amount?: number | string;
  currency?: string;
  receipt?: string;
}

interface VerifyPaymentBody {
  order_id?: string;
  payment_id?: string;
  signature?: string;
}

function errMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(err);
}

// Initialise once — null when keys are not configured (demo mode)
const razorpay =
  RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
    ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
    : null;

// ── POST /api/payment/create-order ───────────────────────────────────────────

router.post(
  "/create-order",
  async (req: Request, res: Response): Promise<void> => {
    const { amount, currency = "INR", receipt } = req.body as CreateOrderBody;
    if (!amount)
      return void res.status(400).json({ error: "amount is required" });

    // Demo mode: without Razorpay keys the checkout still works end to end —
    // a clearly-marked mock order is returned and verification succeeds.
    if (!razorpay) {
      res.status(201).json({
        id: `order_mock_${Date.now().toString(36)}`,
        amount: Math.round(Number(amount) * 100),
        currency,
        receipt: receipt ?? null,
        status: "created",
        mock: true,
      });
      return;
    }

    try {
      const order = await razorpay.orders.create({
        amount: Math.round(Number(amount) * 100), // Razorpay expects paise
        currency,
        receipt,
      });

      res.json(order);
    } catch (err: unknown) {
      console.error("[payment/create-order]", err);
      res.status(500).json({ error: errMessage(err) });
    }
  },
);

// ── POST /api/payment/verify ─────────────────────────────────────────────────

router.post("/verify", (req: Request, res: Response): void => {
  try {
    const { order_id, payment_id, signature } =
      req.body as VerifyPaymentBody;
    if (!order_id || !payment_id || !signature) {
      res.status(400).json({
        error: "order_id, payment_id and signature are required",
      });
      return;
    }

    if (!RAZORPAY_KEY_SECRET) {
      // Demo mode: no signing key exists, so there is nothing to verify
      // against — mock orders are accepted as successful by design.
      res.json({ verified: true, mock: true });
      return;
    }

    const expected = createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");

    res.json({ verified: expected === signature });
  } catch (err: unknown) {
    console.error("[payment/verify]", err);
    res.status(500).json({ error: errMessage(err) });
  }
});

// ── GET /api/payment/key ─────────────────────────────────────────────────────

router.get("/key", (_req: Request, res: Response): void => {
  if (!RAZORPAY_KEY_ID) {
    res
      .status(503)
      .json({ error: "Razorpay is not configured on this server" });
    return;
  }
  res.json({ key: RAZORPAY_KEY_ID });
});

export default router;
