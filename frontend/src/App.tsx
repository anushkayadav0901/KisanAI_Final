import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Home } from "./pages/Home";
import Consult from "./pages/Consult";
import Monitoring from "./pages/Monitoring";
import { MarketInsights } from "./pages/MarketInsights";
import Water from "./pages/SmartFarming";
import Research from "./pages/Research";
import CommandCentre from "./pages/CommandCentre";
import Advisory from "./pages/Advisory";
import Consent from "./pages/Consent";
import Chatbot from "./components/Chatbot";
import { ConnectionBar } from "./components/offline/ConnectionBar";

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-white">
        <Navbar />
        <ConnectionBar />
        <Chatbot />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/monitor" element={<Monitoring />} />
            <Route path="/consult" element={<Consult />} />
            <Route path="/market" element={<MarketInsights />} />
            <Route path="/farming" element={<Water />} />
            <Route path="/research" element={<Research />} />
            <Route path="/advisory" element={<Advisory />} />
            <Route path="/consent" element={<Consent />} />
            <Route path="/command" element={<CommandCentre />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
