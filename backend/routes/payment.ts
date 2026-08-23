import { createHmac } from "crypto";
import type { Request, Response } from "express";
import { Router } from "express";
import Razorpay from "razorpay";
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from "../config.js";

const router = Router();

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

const razorpay =
  RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
    ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
    : null;

router.post(
  "/create-order",
  async (req: Request, res: Response): Promise<void> => {
    const { amount, currency = "INR", receipt } = req.body as CreateOrderBody;
    if (!amount)
      return void res.status(400).json({ error: "amount is required" });

    if (!razorpay) {
      return void res.status(503).json({
        error: "Payments are not configured on this server",
      });
    }

    try {
      const order = await razorpay.orders.create({
        amount: Math.round(Number(amount) * 100),
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
      res.status(503).json({
        error: "Payments are not configured on this server",
      });
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
