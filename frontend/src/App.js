import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import axios from "axios";
import { HOME } from "@/constants/testIds";
import PrivacyPolicy from "@/components/PrivacyPolicy";
import DataDeletion from "@/components/DataDeletion";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const helloWorldApi = async () => {
    try {
      const response = await axios.get(`${API}/`);
      console.log(response.data.message);
    } catch (e) {
      console.error(e, `errored out requesting / api`);
    }
  };

  useEffect(() => {
    helloWorldApi();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white px-6">
      <div className="max-w-2xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center mx-auto mb-6 text-3xl font-bold">
          S
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-3" data-testid={HOME.emergentLink}>
          SpeakMate AI
        </h1>
        <p className="text-lg text-indigo-200 mb-2">
          Communication Skills &amp; Job Readiness Platform
        </p>
        <p className="text-sm text-indigo-300/80 mb-8 max-w-md mx-auto">
          AI-powered coach for interviews, sales roleplays, resume mock interviews, and a
          30-day job-ready roadmap.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/privacy"
            className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-medium transition"
            data-testid="home-privacy-link"
          >
            Privacy Policy
          </Link>
          <Link
            to="/data-deletion"
            className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-medium transition"
            data-testid="home-deletion-link"
          >
            Delete Account
          </Link>
          <a
            href="mailto:support@speakmate.ai"
            className="px-5 py-2.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100 text-sm font-medium transition"
            data-testid="home-contact-link"
          >
            Contact Support
          </a>
        </div>
        <p className="text-xs text-indigo-300/60 mt-12">
          © 2026 SpeakMate AI. Available on Google Play Store soon.
        </p>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/data-deletion" element={<DataDeletion />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
