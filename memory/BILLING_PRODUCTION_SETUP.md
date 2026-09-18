# SpeakMate AI — Production Billing Security Setup

Complete step-by-step guide to move from **development trust-mode** → **fully secure production billing**.

Everything code-side is DONE. This doc covers only the ops/config steps.

---

## 🎯 The 3 Critical Env Vars

Add these to `/app/backend/.env` (or Emergent deployment secrets):

```env
# 1. Google Play Developer API — validates purchase tokens with Google
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@....iam.gserviceaccount.com",...}

# 2. Firebase Admin SDK — verifies mobile app's ID tokens (Bearer <token>)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"speakmate-ai-...","private_key":"...","client_email":"..."}

# 3. Flip on strict mode — REFUSES trust-mode fallback
SECURE_BILLING=true

# 4. (optional) RTDN webhook shared secret
RTDN_PUSH_TOKEN=<any_random_32_char_string>
PLAY_PACKAGE_NAME=com.speakmate.ai
```

Once these are set, **only** signed Firebase ID tokens are accepted AND **only** Google-verified receipts unlock premium. Fake curl attacks will return 401/503.

---

## 1️⃣ Google Play Developer API Setup (verifies purchases)

### A. Create service account in Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Select the same project that Play Console is linked to (or create one)
3. **APIs & Services → Library** → search **"Google Play Android Developer API"** → **Enable**
4. **APIs & Services → Credentials** → **Create Credentials → Service account**
5. Name: `speakmate-play-verifier` → **Create and Continue**
6. Grant NO project-level roles (Play Console gives permissions separately) → **Done**
7. Click the new service account → **Keys → Add Key → Create new key → JSON**
8. Download the JSON file — this is your `GOOGLE_SERVICE_ACCOUNT_JSON` value

### B. Grant Play Console permissions
1. https://play.google.com/console → **Setup → API access**
2. If not linked: **Link Google Cloud project** → pick the one from step A
3. Under **Service accounts**, find `speakmate-play-verifier@...` → **Grant access**
4. Enable these permissions on **App → SpeakMateAI** (do NOT grant account-level):
   - ✅ View app information and download bulk reports
   - ✅ View financial data, orders, and cancellation survey responses
   - ✅ Manage orders and subscriptions
5. **Invite user** / Save

### C. Wait 24 hours
Google's permission propagation is slow. If you test earlier, you'll see `play_api_error:401`. This is normal.

### D. Add to backend
```bash
# Single-line escape the JSON, then paste as one env var:
python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)))" < service-account.json
# Copy output → GOOGLE_SERVICE_ACCOUNT_JSON=<paste>
```

Or use path-based (safer for large keys):
```env
GOOGLE_SERVICE_ACCOUNT_PATH=/app/backend/secrets/play-verifier.json
```

---

## 2️⃣ Firebase Admin SDK Setup (verifies user ID tokens)

### A. Get service account
1. Firebase Console → https://console.firebase.google.com/ → your **speakmate-ai** project
2. **⚙️ Project settings → Service accounts** tab
3. **Firebase Admin SDK** section → **Generate new private key** → downloads JSON
4. Same escaping process:
   ```bash
   python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)))" < firebase-admin.json
   ```
5. Set as `FIREBASE_SERVICE_ACCOUNT_JSON` env var

### B. Rules for Firestore (deny client `isPremium` writes)
Firebase Console → Firestore → Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;

      // Client can write ONLY these fields — never isPremium.
      allow create: if request.auth.uid == userId
        && !('isPremium' in request.resource.data);
      allow update: if request.auth.uid == userId
        && !('isPremium' in request.resource.data.diff(resource.data).affectedKeys());
    }
  }
}
```

**Publish** the rules. Now even a rooted user can't set `isPremium: true` via the Firestore SDK.

---

## 3️⃣ Real-Time Developer Notifications (RTDN) Setup

RTDN is how Google tells your backend about refunds, cancellations, expirations, holds, etc. Without this, a refunded user keeps premium until `expires_at`.

### A. Create Pub/Sub topic
1. Google Cloud Console → **Pub/Sub → Topics → Create topic**
2. Topic ID: `play-rtdn` → **Create**
3. Click the topic → **Permissions → Add principal**
4. Principal: `google-play-developer-notifications@system.gserviceaccount.com`
5. Role: **Pub/Sub Publisher** → **Save**

### B. Create push subscription
1. Pub/Sub → Subscriptions → Create
2. Topic: `play-rtdn`
3. Delivery type: **Push**
4. Endpoint URL: `https://gift-hub-sync.emergent.host/api/system/rtdn?token=<RTDN_PUSH_TOKEN>` (use the same secret you set in env)
5. Ack deadline: 60 seconds
6. **Create**

### C. Enable in Play Console
1. Play Console → **Monetize → Monetization setup**
2. **Real-time developer notifications** section
3. Topic name: `projects/<gcp-project-id>/topics/play-rtdn`
4. **Send test notification** — you should see a `200 OK` in Pub/Sub delivery logs and `[rtdn] test ping` in backend logs

---

## 4️⃣ Flip On Strict Mode

Once all 3 env vars are set and services deployed:

```env
SECURE_BILLING=true
```

Restart backend. From now on:
- ❌ Requests without `Authorization: Bearer <firebase_id_token>` → **401**
- ❌ Requests with `X-Is-Premium: true` header → header is **completely ignored**
- ❌ Verify with unrecognized purchase token → **400 play_verification_failed:404**
- ❌ Cross-user token replay → **403 purchase_token_bound_to_other_user**
- ❌ Backend without Google credentials → **503 verification_unavailable**

---

## 5️⃣ Attack Simulation — Verify Production is Secure

Run these AFTER SECURE_BILLING=true is deployed:

```bash
BE=https://gift-hub-sync.emergent.host

# 1. Anonymous curl to /quota → expect 401
curl -s -w "%{http_code}\n" $BE/api/system/quota

# 2. Header-injection attempt → expect 401 (X-Is-Premium is ignored anyway)
curl -s -w "%{http_code}\n" -H "X-User-Id: any" -H "X-Is-Premium: true" $BE/api/system/quota

# 3. Fake purchase token replay → expect 401 (missing bearer)
curl -s -w "%{http_code}\n" -X POST $BE/api/system/subscription/verify \
  -H "Content-Type: application/json" \
  -d '{"product_id":"premium_lifetime","purchase_token":"fake"}'

# 4. Bearer with invalid token → expect 401 invalid_id_token
curl -s -w "%{http_code}\n" -X POST $BE/api/system/subscription/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJfake.token.here" \
  -d '{"product_id":"premium_lifetime","purchase_token":"fake"}'

# 5. Legit bearer + fake purchase token → expect 400 play_verification_failed
#    (You need to grab a real Firebase ID token from the app for this test)
```

All 5 should refuse the attacker.

---

## 6️⃣ Play Console Product Setup — Final Checklist

- [ ] `premium_monthly` subscription **published** with base plan `monthly` **activated** (₹149, 1 month, 3-day free trial optional)
- [ ] `premium_yearly` subscription **published** with base plan `yearly` **activated** (₹799, 1 year)
- [ ] `premium_lifetime` **one-time in-app product** **active** (₹1499)
- [ ] Testing → Internal testing → Track has a released AAB (versionCode ≥ 12)
- [ ] Setup → License testing → Testers added, they clicked opt-in link
- [ ] Setup → App content → Ads → **Yes, this app contains ads** ✅
- [ ] Setup → App content → **Advertising ID declaration** submitted (Advertising or marketing only)
- [ ] Setup → API access → Service account granted 3 permissions above

---

## 7️⃣ Manual Testing Matrix (After Setup)

| Test | Expected | How |
|---|---|---|
| Buy monthly (test card) | 3-day trial → then ₹149/mo | Play sheet → complete purchase |
| Verify backend recorded `source: play_billing` | ✅ | Mongo `db.subscriptions.findOne({uid})` |
| Reinstall app → premium auto-restored | ✅ | Uninstall → reinstall → login |
| 2nd device login | Premium unlocks without tapping restore | Fresh device, same Firebase account |
| Buy yearly | Higher quotas (100/day tutor_chat) | `/api/system/quota` shows plan=yearly |
| Buy lifetime | Never expires | Force `expires_at` past → still premium (add check) |
| Cancel monthly in Play | Within minutes, RTDN fires → premium revoked | Check logs for `[rtdn] revoked sub token=...` |
| Request refund | Same as cancel — auto-revoke | Play Console → order refund |
| Curl with fake token | 400 rejected | See Section 5 |
| Curl with X-Is-Premium header | 401 or ignored | See Section 5 |

---

## 8️⃣ File Reference (What Changed)

**Backend:**
- `/app/backend/auth_deps.py` — new — Firebase ID token verifier + `require_uid` dependency
- `/app/backend/system_routes.py` — all subscription endpoints use `require_uid`, unique index on token, cross-user replay check, RTDN webhook, strict-mode rejection
- `/app/backend/play_verifier.py` — added SUBSCRIPTION_STATE_ON_HOLD to grace list
- `/app/backend/ai_routes.py` — `_guard()` resolves premium from DB, ignores `X-Is-Premium` header
- `/app/backend/requirements.txt` — added `firebase-admin`, `CacheControl`, `google-cloud-firestore`

**Frontend (SpeakMateAI):**
- `/app/SpeakMateAI/src/services/tokenProvider.ts` — new — `attachIdToken()` helper for Firebase Bearer tokens
- `/app/SpeakMateAI/src/services/billingService.ts` — Bearer auth + `fetchStatus()` for auto-restore
- `/app/SpeakMateAI/src/services/aiService.ts` — Bearer auth on all AI requests
- `/app/SpeakMateAI/src/services/usageService.ts` — Bearer auth on quota fetches
- `/app/SpeakMateAI/src/services/authService.ts` — no longer writes `isPremium` to Firestore
- `/app/SpeakMateAI/src/contexts/AuthContext.tsx` — auto-fetches `/subscription/status` on every login and reconciles local state

---

## 9️⃣ Rollout Order

1. **Now** (dev — no code changes needed):
   - Redeploy backend (Save to GitHub) — SKU drift fix + all security code goes live
   - Backend still runs in trust-mode (SECURE_BILLING=false) — existing app keeps working
   - Users can test billing but attackers CAN still forge tokens (but no other holes)

2. **Before Play Store production release** (add creds one by one):
   - Add `FIREBASE_SERVICE_ACCOUNT_JSON` → nothing changes yet (backend still trusts X-User-Id)
   - Add `GOOGLE_SERVICE_ACCOUNT_JSON` → real verification kicks in for new purchases
   - Wait 24h for Google permissions
   - Run attack simulation (Section 5) → confirm rejections
   - Publish Firestore rules (Section 2B)

3. **Final security switch:**
   - Set `SECURE_BILLING=true` and redeploy
   - Build fresh AAB with the new frontend (Bearer auth code) and upload to internal testing
   - Test on real device — everything should still work because AuthContext auto-adds Bearer
   - Roll out to production

---

## 🆘 Rollback

If anything breaks after enabling SECURE_BILLING:

```bash
# Just remove the env var and redeploy — backend falls back to X-User-Id trust mode.
# All existing subscription records + purchase tokens remain valid.
```
