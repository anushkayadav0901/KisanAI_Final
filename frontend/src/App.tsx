import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Navbar } from "./components/Navbar";
import { ScrollToTop } from "./components/ScrollToTop";
import { Home } from "./pages/Home";
import Consult from "./pages/Consult";
import Monitoring from "./pages/Monitoring";
import { MarketInsights } from "./pages/MarketInsights";
import Water from "./pages/SmartFarming";
import Research from "./pages/Research";
import CommandCentre from "./pages/CommandCentre";
import Advisory from "./pages/Advisory";
import Consent from "./pages/Consent";
import Fields from "./pages/Fields";
import NotFound from "./pages/NotFound";
import Chatbot from "./components/Chatbot";
import { ConnectionBar } from "./components/offline/ConnectionBar";

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <div className="min-h-screen bg-white">
        <Navbar />
        <ConnectionBar />
        <Chatbot />
        <Toaster
          position="top-right"
          containerStyle={{ top: 88 }}
          toastOptions={{
            style: {
              background: "#FFFFFF",
              color: "#5B532C",
              border: "1px solid rgba(91,83,44,0.12)",
              borderRadius: "16px",
              fontSize: "13px",
              fontWeight: 500,
              boxShadow: "0 10px 30px rgba(91,83,44,0.10)",
            },
            success: { iconTheme: { primary: "#63A361", secondary: "#FFFFFF" } },
          }}
        />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/monitor" element={<Monitoring />} />
            <Route path="/consult" element={<Consult />} />
            <Route path="/market" element={<MarketInsights />} />
            <Route path="/farming" element={<Water />} />
            <Route path="/research" element={<Research />} />
            <Route path="/advisory" element={<Advisory />} />
            <Route path="/fields" element={<Fields />} />
            <Route path="/consent" element={<Consent />} />
            <Route path="/command" element={<CommandCentre />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
