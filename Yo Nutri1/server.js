const express = require("express");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
app.use(express.json());

app.post("/verify", (req, res) => {
  const { order_id, payment_id, signature } = req.body;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  let hmac = crypto.createHmac("sha256", key_secret);
  hmac.update(order_id + "|" + payment_id);
  let generated_signature = hmac.digest("hex");

  if (generated_signature === signature) {
    res.send("✅ Payment Verified");
  } else {
    res.status(400).send("❌ Verification Failed");
  }
});

app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));

