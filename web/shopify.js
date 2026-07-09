import { BillingInterval, LATEST_API_VERSION } from "@shopify/shopify-api";
import { shopifyApp } from "@shopify/shopify-app-express";
import { MongoDBSessionStorage } from "@shopify/shopify-app-session-storage-mongodb";
import { restResources } from "@shopify/shopify-api/rest/admin/2023-04";
import dotenv from "dotenv";

dotenv.config();

/**
 * Billing plans.
 *
 * ⚠️ IMPORTANT: The plan NAMES below must match the names on merchants'
 * existing Shopify subscriptions exactly. Shopify's billing.check() matches by
 * name, so if these differ from what the previous host used, paying merchants
 * will be reported as "free" and lose their paid features. Confirm the exact
 * names (from the dev, or by reading an installed store's activeSubscriptions)
 * and set BASIC_PLAN_NAME / PREMIUM_PLAN_NAME env vars if they differ.
 *
 * UI (Pricing.jsx) -> backend tier -> constant here:
 *   "Basic"   $10/mo -> tier "premium"   -> PREMIUM_PLAN
 *   "Premium" $100/mo -> tier "unlimited" -> UNLIMITED_PLAN
 */
export const PREMIUM_PLAN = process.env.BASIC_PLAN_NAME || "Basic Plan"; // $10/mo
export const UNLIMITED_PLAN = process.env.PREMIUM_PLAN_NAME || "Premium Plan"; // $100/mo

const billingConfig = {
  [PREMIUM_PLAN]: {
    amount: 10,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
  },
  [UNLIMITED_PLAN]: {
    amount: 100,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
  },
};

const shopify = shopifyApp({
  api: {
    apiVersion: LATEST_API_VERSION,
    restResources,
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    hostName: process.env.HOST.replace(/https?:\/\//, ""),
    scopes: process.env.SCOPES ? process.env.SCOPES.split(",") : [],
    billing: billingConfig,
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  // Session storage — connection comes from env (see .env.example)
  sessionStorage: new MongoDBSessionStorage(
    process.env.MONGODB_URI,
    process.env.MONGODB_DB || "scroll2top"
  ),
});

export default shopify;
