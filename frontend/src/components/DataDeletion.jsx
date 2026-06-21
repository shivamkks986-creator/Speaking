import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function DataDeletion() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const badge = document.getElementById("emergent-badge");
    const prev = badge ? badge.style.display : null;
    if (badge) badge.style.display = "none";
    return () => {
      if (badge) badge.style.display = prev || "";
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText("privacy@speakmate.ai");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
              <h1 className="text-2xl font-bold text-slate-900" data-testid="deletion-title">
                SpeakMate AI
              </h1>
              <p className="text-xs text-slate-500">
                Communication Skills &amp; Job Readiness Platform
              </p>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mt-6">
            Account &amp; Data Deletion
          </h2>
          <p className="text-sm text-slate-500 mt-2" data-testid="deletion-last-updated">
            Last updated: 21 February 2026
          </p>
        </div>

        {/* Intro */}
        <p className="text-base leading-relaxed mb-8">
          You have the full right to delete your SpeakMate AI account and all associated
          personal data at any time. This page explains the two ways to request deletion
          and exactly what data is removed.
        </p>

        {/* Method 1 */}
        <section className="mb-10">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <h3 className="text-xl font-semibold text-slate-900">
                In-App Deletion (Recommended &mdash; Instant)
              </h3>
            </div>
            <ol className="list-decimal pl-6 space-y-2 text-slate-700 text-sm">
              <li>Open the SpeakMate AI app on your device.</li>
              <li>
                Sign in with your account (if not already logged in).
              </li>
              <li>
                Go to <strong>Profile</strong> &rarr; <strong>Settings</strong> &rarr;{" "}
                <strong>Account</strong>.
              </li>
              <li>
                Tap <strong>"Delete Account"</strong>.
              </li>
              <li>
                Confirm by typing <code className="bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">DELETE</code>{" "}
                in the confirmation dialog.
              </li>
              <li>
                Your account and all data are <strong>permanently erased within 24 hours</strong>.
              </li>
            </ol>
          </div>
        </section>

        {/* Method 2 */}
        <section className="mb-10">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <h3 className="text-xl font-semibold text-slate-900">
                Email Request (For Lost Access)
              </h3>
            </div>
            <p className="text-sm text-slate-700 mb-3">
              If you cannot access your account (lost password, lost device), send a
              deletion request to:
            </p>
            <div className="flex items-center gap-2 mb-3">
              <a
                href="mailto:privacy@speakmate.ai?subject=Account%20Deletion%20Request&body=Hi%20SpeakMate%20AI%20Team%2C%0A%0AI%20request%20deletion%20of%20my%20account%20and%20all%20associated%20data.%0A%0ARegistered%20Email%3A%20%5Byour%20email%5D%0AReason%20(optional)%3A%20%0A%0AThank%20you."
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
                data-testid="deletion-email-link"
              >
                ✉ privacy@speakmate.ai
              </a>
              <button
                onClick={handleCopy}
                className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm hover:bg-slate-100 transition"
                data-testid="deletion-copy-btn"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <p className="text-sm text-slate-700 mb-2">
              <strong>Subject line:</strong> "Account Deletion Request"
            </p>
            <p className="text-sm text-slate-700 mb-2">
              <strong>Include in body:</strong>
            </p>
            <ul className="list-disc pl-6 text-sm text-slate-700 space-y-1">
              <li>Your registered email address</li>
              <li>Approximate signup date (if you remember)</li>
              <li>(Optional) Reason for leaving — helps us improve</li>
            </ul>
            <p className="text-sm text-slate-700 mt-3">
              We respond and process deletion within{" "}
              <strong>7 business days</strong>.
            </p>
          </div>
        </section>

        {/* What gets deleted */}
        <section className="mb-10">
          <h3 className="text-xl font-semibold text-slate-900 mb-3">
            What Data Gets Deleted
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border border-slate-200 rounded-lg text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-4 py-2 border-b border-slate-200">Data Type</th>
                  <th className="text-left px-4 py-2 border-b border-slate-200">Action</th>
                  <th className="text-left px-4 py-2 border-b border-slate-200">Timeline</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2 border-b border-slate-100">Email, name, password hash</td>
                  <td className="px-4 py-2 border-b border-slate-100 text-red-600 font-medium">Permanently deleted</td>
                  <td className="px-4 py-2 border-b border-slate-100">Within 24 hours</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b border-slate-100">TMAY / Sales / Resume practice transcripts</td>
                  <td className="px-4 py-2 border-b border-slate-100 text-red-600 font-medium">Permanently deleted</td>
                  <td className="px-4 py-2 border-b border-slate-100">Within 24 hours</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b border-slate-100">AI feedback scores &amp; roadmap progress</td>
                  <td className="px-4 py-2 border-b border-slate-100 text-red-600 font-medium">Permanently deleted</td>
                  <td className="px-4 py-2 border-b border-slate-100">Within 24 hours</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b border-slate-100">Resume PDF uploads</td>
                  <td className="px-4 py-2 border-b border-slate-100 text-red-600 font-medium">Already auto-deleted</td>
                  <td className="px-4 py-2 border-b border-slate-100">Immediately after parsing</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b border-slate-100">Firebase authentication record</td>
                  <td className="px-4 py-2 border-b border-slate-100 text-red-600 font-medium">Permanently deleted</td>
                  <td className="px-4 py-2 border-b border-slate-100">Within 24 hours</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b border-slate-100">Crash logs (anonymized)</td>
                  <td className="px-4 py-2 border-b border-slate-100 text-amber-700 font-medium">Retained (anonymous)</td>
                  <td className="px-4 py-2 border-b border-slate-100">90 days, then purged</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b border-slate-100">Aggregated analytics (no personal link)</td>
                  <td className="px-4 py-2 border-b border-slate-100 text-amber-700 font-medium">Retained (anonymous)</td>
                  <td className="px-4 py-2 border-b border-slate-100">Indefinitely</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Important notes */}
        <section className="mb-10">
          <h3 className="text-xl font-semibold text-slate-900 mb-3">Important Notes</h3>
          <ul className="list-disc pl-6 space-y-2 text-slate-700 text-sm">
            <li>
              <strong>Deletion is permanent.</strong> Once processed, your data cannot be recovered.
            </li>
            <li>
              <strong>Active subscriptions</strong> (if any) will be cancelled automatically. Refunds follow Google Play&apos;s standard refund policy.
            </li>
            <li>
              Some data may be retained briefly for{" "}
              <strong>legal compliance</strong> (fraud prevention, tax records) where required by law.
            </li>
            <li>
              We will send a confirmation email once your account is fully deleted.
            </li>
          </ul>
        </section>

        {/* Contact */}
        <section className="mb-10">
          <h3 className="text-xl font-semibold text-slate-900 mb-3">Need Help?</h3>
          <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
            <p className="text-slate-700 text-sm">
              <strong>Developer:</strong> Shivam Kumar
            </p>
            <p className="text-slate-700 text-sm mt-1">
              <strong>Privacy contact:</strong>{" "}
              <a
                href="mailto:privacy@speakmate.ai"
                className="text-indigo-600 hover:underline"
              >
                privacy@speakmate.ai
              </a>
            </p>
            <p className="text-slate-700 text-sm mt-1">
              <strong>General support:</strong>{" "}
              <a
                href="mailto:support@speakmate.ai"
                className="text-indigo-600 hover:underline"
              >
                support@speakmate.ai
              </a>
            </p>
            <p className="text-slate-700 text-sm mt-3">
              For our full data practices, see our{" "}
              <Link
                to="/privacy"
                className="text-indigo-600 hover:underline font-medium"
                data-testid="deletion-privacy-link"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 border-t border-slate-200 pt-6">
          <p>© 2026 SpeakMate AI. All rights reserved.</p>
          <p className="mt-1">
            This page satisfies Google Play Account Deletion (User Data policy) requirements.
          </p>
        </footer>
      </div>
    </div>
  );
}
