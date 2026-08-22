/**
 * routes/payment.js — /api/payment/* endpoints (Razorpay)
 *
 *   POST /api/payment/create-order  — create a Razorpay order
 *   POST /api/payment/verify        — verify payment signature (HMAC-SHA256)
 *   GET  /api/payment/key           — expose publishable key to frontend
 *
 * The Razorpay client is initialised once at module load.
 * If the keys are missing the routes return 503 immediately.
 */

import { createHmac } from "crypto";
import { Router } from "express";
import Razorpay from "razorpay";
import { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } from "../config.js";

const router = Router();

// Initialise once — null when keys are not configured
const razorpay =
  RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
    ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
    : null;

function requireRazorpay(res) {
  if (!razorpay) {
    res.status(503).json({ error: "Razorpay is not configured on this server" });
    return false;
  }
  return true;
}

// ── POST /api/payment/create-order ───────────────────────────────────────────

router.post("/create-order", async (req, res) => {
  if (!requireRazorpay(res)) return;

  try {
    const { amount, currency = "INR", receipt } = req.body;
    if (!amount) return res.status(400).json({ error: "amount is required" });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency,
      receipt,
    });

    res.json(order);
  } catch (err) {
    console.error("[payment/create-order]", err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payment/verify ─────────────────────────────────────────────────

router.post("/verify", (req, res) => {
  try {
    const { order_id, payment_id, signature } = req.body;
    if (!order_id || !payment_id || !signature) {
      return res.status(400).json({ error: "order_id, payment_id and signature are required" });
    }

    const expected = createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");

    res.json({ verified: expected === signature });
  } catch (err) {
    console.error("[payment/verify]", err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/payment/key ─────────────────────────────────────────────────────

router.get("/key", (req, res) => {
  if (!RAZORPAY_KEY_ID) {
    return res.status(503).json({ error: "Razorpay is not configured on this server" });
  }
  res.json({ key: RAZORPAY_KEY_ID });
});

export default router;
