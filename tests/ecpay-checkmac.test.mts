import { computeCheckMacValue, verifyCheckMacValue, buildCheckoutForm } from "../src/lib/payments/ecpay";
import assert from "node:assert/strict";

// Official ECPay docs test vector (developers.ecpay.com.tw, checksum appendix)
const params = {
  TradeDesc: "促銷方案", PaymentType: "aio", MerchantTradeDate: "2023/03/12 15:30:23",
  MerchantTradeNo: "ecpay20230312153023", MerchantID: "3002607",
  ReturnURL: "https://www.ecpay.com.tw/receive.php", ItemName: "Apple iphone 15",
  TotalAmount: 30000, ChoosePayment: "ALL", EncryptType: 1,
};
const mac = computeCheckMacValue(params, "pwFHCqoQZGmho4w6", "EkRm7iFT261dpevs");
assert.equal(mac, "6C51C9E6888DE861FD62FB1DD17029FC742634498FD813DC43D4243B5685B840");
console.log("✓ official test vector");

const signed = { ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), CheckMacValue: mac };
assert.ok(verifyCheckMacValue(signed, { hashKey: "pwFHCqoQZGmho4w6", hashIv: "EkRm7iFT261dpevs" }));
assert.ok(!verifyCheckMacValue({ ...signed, TotalAmount: "1" }, { hashKey: "pwFHCqoQZGmho4w6", hashIv: "EkRm7iFT261dpevs" }));
assert.ok(!verifyCheckMacValue({ ...signed, CheckMacValue: mac.toLowerCase().replace("6","7") }, { hashKey: "pwFHCqoQZGmho4w6", hashIv: "EkRm7iFT261dpevs" }));
console.log("✓ verify accepts valid / rejects tampered");

const form = buildCheckoutForm({ mode: "stage", merchantId: "2000132", hashKey: "5294y06JbISpM5x9", hashIv: "v77hoKGq4kWxNNIS" }, {
  merchantTradeNo: "OABC123", amount: 85, itemNames: ["蛋餅 x2", "奶茶#大杯 x1"], tradeDesc: "內湖高中熱食部",
  returnUrl: "https://x/notify", orderResultUrl: "https://x/result", clientBackUrl: "https://x/order/1",
});
assert.equal(form.action, "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5");
assert.ok(!form.fields.ItemName.includes("奶茶#大杯"), "user '#' must not split items");
assert.ok(verifyCheckMacValue(form.fields, { hashKey: "5294y06JbISpM5x9", hashIv: "v77hoKGq4kWxNNIS" }));
console.log("✓ checkout form self-verifies", form.fields.ItemName);
