import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-6 py-12 text-slate-800">
        {/* Header */}
        <div className="mb-10 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              S
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900" data-testid="privacy-title">
                SpeakMate AI
              </h1>
              <p className="text-xs text-slate-500">Communication Skills & Job Readiness Platform</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mt-6">Privacy Policy</h2>
          <p className="text-sm text-slate-500 mt-2" data-testid="privacy-last-updated">
            Last updated: 21 February 2026
          </p>
        </div>

        {/* Intro */}
        <p className="text-base leading-relaxed mb-8">
          SpeakMate AI ("we", "us", or "our") operates the SpeakMate AI mobile application
          (the "Service"). This Privacy Policy explains how we collect, use, store, and
          disclose information when you use our Service, and the choices you have
          associated with that data. By using the Service, you agree to the collection
          and use of information in accordance with this policy.
        </p>

        {/* Section 1 */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-slate-900 mb-3">1. Information We Collect</h3>

          <h4 className="text-base font-semibold text-slate-800 mt-4 mb-2">1.1 Account Information</h4>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>Email address</li>
            <li>Display name (optional)</li>
            <li>Hashed password (we never store plaintext passwords)</li>
            <li>Authentication tokens issued by Firebase Authentication</li>
          </ul>

          <h4 className="text-base font-semibold text-slate-800 mt-4 mb-2">
            1.2 Learning &amp; Practice Data
          </h4>
          <p className="text-slate-700 mb-2">
            To provide AI feedback and personalized roadmaps, we store:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>Your responses to TMAY (Tell Me About Yourself) prompts</li>
            <li>Sales / counselling roleplay transcripts</li>
            <li>Resume content you upload (text extracted from PDF)</li>
            <li>AI-generated feedback scores (Confidence, Fluency, Clarity, Vocabulary, Pace)</li>
            <li>30-Day roadmap progress and completion status</li>
          </ul>

          <h4 className="text-base font-semibold text-slate-800 mt-4 mb-2">1.3 Device &amp; Usage</h4>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>Device model, OS version, app version</li>
            <li>Crash logs (anonymized)</li>
            <li>Feature usage analytics (anonymized)</li>
          </ul>

          <h4 className="text-base font-semibold text-slate-800 mt-4 mb-2">1.4 Microphone Access</h4>
          <p className="text-slate-700">
            We request microphone access to enable speaking practice. Audio is processed
            on-device or in transit to our AI provider;{" "}
            <strong>we do not persistently store raw audio recordings</strong>.
          </p>

          <h4 className="text-base font-semibold text-slate-800 mt-4 mb-2">
            1.5 What We Do NOT Collect
          </h4>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>Contacts, SMS, call logs</li>
            <li>Location data</li>
            <li>Photos / media beyond uploaded resumes</li>
            <li>Advertising identifiers</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-slate-900 mb-3">2. How We Use Your Information</h3>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>Authenticate you and secure your account</li>
            <li>Generate AI-powered feedback on your speaking practice</li>
            <li>Build and update your 30-Day Job Ready Roadmap</li>
            <li>Improve our AI models (anonymized aggregated data only)</li>
            <li>Send practice reminders via push notifications (opt-out anytime)</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-slate-900 mb-3">3. Third-Party Services</h3>
          <p className="text-slate-700 mb-3">
            We use the following processors. Each provider has its own privacy policy.
            We share only the minimum data necessary.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border border-slate-200 rounded-lg text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-4 py-2 border-b border-slate-200">Service</th>
                  <th className="text-left px-4 py-2 border-b border-slate-200">Purpose</th>
                  <th className="text-left px-4 py-2 border-b border-slate-200">Data Shared</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2 border-b border-slate-100">Firebase Authentication (Google)</td>
                  <td className="px-4 py-2 border-b border-slate-100">User login</td>
                  <td className="px-4 py-2 border-b border-slate-100">Email, password hash</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b border-slate-100">
                    OpenAI / Google Gemini / Anthropic Claude
                  </td>
                  <td className="px-4 py-2 border-b border-slate-100">AI feedback generation</td>
                  <td className="px-4 py-2 border-b border-slate-100">
                    Your practice responses (text only)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b border-slate-100">MongoDB Atlas</td>
                  <td className="px-4 py-2 border-b border-slate-100">Database storage</td>
                  <td className="px-4 py-2 border-b border-slate-100">All app data</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4 */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-slate-900 mb-3">4. Data Retention</h3>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>Account data: retained until you delete your account.</li>
            <li>Practice transcripts: retained 90 days, then anonymized.</li>
            <li>Resume uploads: deleted immediately after parsing.</li>
            <li>
              Full deletion on request — email{" "}
              <a
                href="mailto:privacy@speakmate.ai"
                className="text-indigo-600 hover:underline"
                data-testid="privacy-contact-email"
              >
                privacy@speakmate.ai
              </a>
              .
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-slate-900 mb-3">5. Data Security</h3>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>All data in transit is encrypted via HTTPS / TLS 1.2+.</li>
            <li>Passwords are hashed using bcrypt.</li>
            <li>API requests are rate-limited per user.</li>
            <li>We do not sell your data to any third party.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-slate-900 mb-3">6. Children's Privacy</h3>
          <p className="text-slate-700">
            SpeakMate AI is intended for users aged 13 and above. We do not knowingly
            collect data from children under 13. If you believe we have, contact us
            immediately.
          </p>
        </section>

        {/* Section 7 */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-slate-900 mb-3">7. Your Rights</h3>
          <ul className="list-disc pl-6 space-y-1 text-slate-700">
            <li>Access your data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and all associated data</li>
            <li>Withdraw consent for AI processing</li>
            <li>Export your data in JSON format</li>
          </ul>
          <p className="text-slate-700 mt-3">
            To exercise these rights, email{" "}
            <a
              href="mailto:privacy@speakmate.ai"
              className="text-indigo-600 hover:underline"
            >
              privacy@speakmate.ai
            </a>
            .
          </p>
        </section>

        {/* Section 8 */}
        <section className="mb-8">
          <h3 className="text-xl font-semibold text-slate-900 mb-3">8. Changes to This Policy</h3>
          <p className="text-slate-700">
            We may update this Privacy Policy. You will be notified via an in-app banner
            and email at least 30 days before material changes take effect.
          </p>
        </section>

        {/* Section 9 */}
        <section className="mb-10">
          <h3 className="text-xl font-semibold text-slate-900 mb-3">9. Contact</h3>
          <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
            <p className="text-slate-700">
              <strong>Developer:</strong> Shivam Singh
            </p>
            <p className="text-slate-700 mt-1">
              <strong>Email:</strong>{" "}
              <a
                href="mailto:privacy@speakmate.ai"
                className="text-indigo-600 hover:underline"
              >
                privacy@speakmate.ai
              </a>
            </p>
            <p className="text-slate-700 mt-1">
              <strong>Support:</strong>{" "}
              <a
                href="mailto:support@speakmate.ai"
                className="text-indigo-600 hover:underline"
              >
                support@speakmate.ai
              </a>
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 border-t border-slate-200 pt-6">
          <p>© 2026 SpeakMate AI. All rights reserved.</p>
          <p className="mt-1">
            This Privacy Policy was crafted to satisfy Google Play Data Safety, GDPR (EU),
            and DPDP (India) requirements.
          </p>
        </footer>
      </div>
    </div>
  );
}
