# Play Console — Subscription & Product Setup

Ye guide `/api/system/pricing` endpoint aur `billingService.ts` mein use hone wale SKUs Play Console mein create karne ke exact steps deta hai. Ye steps aap Play Console mein ek baar karte ho — code mein SKU names already baked in hain.

## Package name
`com.speakmate.ai` (already set in `app.json` + `build.gradle`)

## SKUs to create

| Type | Product ID | Base plan ID | Price (INR) |
|------|------------|--------------|-------------|
| Subscription | `speakmate_monthly_149` | `monthly-autorenew` | ₹149 / month |
| Subscription | `speakmate_yearly_799` | `yearly-autorenew` | ₹799 / year |
| One-time (managed) | `speakmate_lifetime_1499` | — | ₹1,499 |

---

## Step-by-step

### 1. Login to Play Console
1. Go to https://play.google.com/console
2. Select your app: **SpeakMate AI**
3. Left sidebar → **Monetize** → **Products**

### 2. Create the monthly subscription
1. Click **Subscriptions** → **Create subscription**
2. Product ID (must match exactly): `speakmate_monthly_149`
3. Name: `SpeakMate Premium — Monthly`
4. Description: `Unlimited AI tutor, voice practice, interview mock, no ads.`
5. Benefits (add 3):
   - `Unlimited AI conversations`
   - `Ad-free experience`
   - `Premium voices + IELTS mode`
6. Click **Save**

7. **Base plans and offers** section → **Add base plan**
   - Base plan ID: `monthly-autorenew`
   - Type: **Auto-renewing**
   - Billing period: **1 month**
   - Renewal type: **Auto-renewing**
   - Price: **INR ₹149.00** (Play Console will auto-suggest other-country prices — accept defaults)
8. Save + **Activate** the base plan

### 3. Create the yearly subscription
Repeat step 2 with:
- Product ID: `speakmate_yearly_799`
- Name: `SpeakMate Premium — Yearly`
- Base plan ID: `yearly-autorenew`
- Billing period: **1 year**
- Price: **INR ₹799.00**
- **Activate**

### 4. Create the lifetime one-time product
1. **Monetize** → **Products** → **In-app products** → **Create product**
2. Product ID: `speakmate_lifetime_1499`
3. Name: `SpeakMate Lifetime`
4. Description: `Lifetime access to SpeakMate Premium — one payment, forever.`
5. Price: **INR ₹1,499.00**
6. Save + **Activate**

### 5. License testers (mandatory for testing without real payment)
1. Play Console → **Setup** → **License testing**
2. Add your test Gmail addresses (comma-separated)
3. License response: **RESPOND_NORMALLY**
4. Save

### 6. Internal testing track (mandatory for IAP to work)
IAP does **not** work on debug/sideloaded builds. You must:
1. Play Console → **Testing** → **Internal testing** → **Create new release**
2. Upload the AAB (v1.0.9 / versionCode 10)
3. Add your test Gmail address to the internal testers list
4. Publish → Wait 1–2 hours for propagation
5. On your device, open the invite link → install SpeakMate from Play Store (NOT sideload)
6. Now IAP will fetch products + accept purchases

### 7. Service account (for backend `/subscription/verify` real validation)
Only needed once you want the backend to reject fake tokens. Optional for launch — the fallback trust-mode works fine until you set this up.

1. Play Console → **Users and permissions** → **Invite users** → **API access**
2. Google Cloud → **APIs & Services** → Enable **Google Play Developer API**
3. Google Cloud → **IAM & Admin** → **Service Accounts** → **Create service account**
4. Grant **Service Account User** role
5. Create a **JSON key** → download
6. Play Console → **Users and permissions** → **Invite user** → paste the service account email
7. Permissions: **Financial data** (View), **Orders** (View) — that's the minimum for `subscriptionsv2.get` + `products.get`
8. Copy the JSON contents into Emergent env var: `GOOGLE_SERVICE_ACCOUNT_JSON`
9. Redeploy backend from Emergent dashboard

Once step 8 is done, `/api/system/subscription/verify` will start returning `source: "play_billing"` instead of `source: "play_billing_unverified"`.

---

## Verification checklist

After setup, verify with:

```bash
# Server side — check pricing endpoint still returns the exact SKU strings the app expects
curl https://your-backend/api/system/pricing
```

Expected:
```json
{
  "monthly_sku": "speakmate_monthly_149",
  "yearly_sku": "speakmate_yearly_799",
  "lifetime_sku": "speakmate_lifetime_1499",
  ...
}
```

Device side (in the SpeakMate app after installing from internal testing track):
1. Open Premium screen
2. All 3 plans should show real ₹149 / ₹799 / ₹1499 prices (from Play, not fallback)
3. Tap Subscribe → real Play Billing sheet opens
4. Test with **License tester** Gmail → no real charge
5. After purchase, app should show `You're Premium 🎉`
6. Check backend logs: subscription doc created with `source: "play_billing"` (once service account is wired)

## Common gotchas

| Symptom | Cause | Fix |
|---------|-------|-----|
| Products don't load | Base plan not activated | Play Console → Subscription → Activate base plan |
| "This item is not available in your country" | Country/price mismatch | Add India pricing explicitly |
| "Application not licensed" | Account not in License testers | Add Gmail to License testing |
| Real charge instead of test | Not a licensed tester | Ensure test Gmail is in License testers list |
| `getSubscriptions` returns empty | Wrong package or app not in Play | Must install via internal testing link |
