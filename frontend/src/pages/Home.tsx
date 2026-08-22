import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Leaf, TrendingUp, Users, Shield, CheckCircle2, Mic } from 'lucide-react';
import Market from '../components/Market';
import About from '../components/About';
import CTA from '../components/CTA';
import Footer from '../components/Footer';
import heroImage from '../assets/hero.png';

const ScrollIndicator = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 z-40 h-0.5 origin-left bg-[#63A361]"
    />
  );
};

/**
 * Live network scale, read from the same public API a state department would
 * call. Hardcoded numbers on a landing page are marketing; these move when the
 * network moves, and fall back to dashes rather than to invented figures if the
 * API cannot be reached.
 */
function useNetworkScale() {
  const [totals, setTotals] = React.useState<{
    states: number;
    districts: number;
    farmersReached: number;
    languages: number;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/v1/surveillance/states")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setTotals({
          states: d.totals.states,
          districts: d.totals.districts,
          farmersReached: d.totals.farmers_reached,
          languages: d.totals.advisory_languages,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return totals;
}

const compact = (n: number) =>
  n >= 10000000
    ? `${(n / 10000000).toFixed(1)} Cr`
    : n >= 100000
      ? `${(n / 100000).toFixed(1)} L`
      : n >= 1000
        ? `${(n / 1000).toFixed(1)}K`
        : String(n);

export const Home: React.FC = () => {
  const scale = useNetworkScale();

  return (
    <div className="relative bg-white">
      <ScrollIndicator />

      {/* Hero Section - Centered Layout */}
      <section className="relative min-h-screen pt-32 pb-20">
        {/* Background - Dot Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Dot Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage: `radial-gradient(circle, #5B532C 1.2px, transparent 1.2px)`,
              backgroundSize: '22px 22px'
            }}
          />
          {/* Subtle Gradient Orbs */}
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#63A361]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-[#FDE7B3]/10 rounded-full blur-3xl" />
        </div>

        <div className="relative px-4 mx-auto max-w-7xl">
          {/* Top Section - Centered Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            {/* Headline with Generative AI */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#5B532C] leading-[1.1] mb-6">
              Smart Farming Made Simple with{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-[#63A361] via-[#FFC50F] to-[#63A361] bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent px-2">
                  Generative AI
                </span>
                <span className="absolute inset-0 bg-[#FDE7B3]/50 rounded-lg -rotate-1"></span>
              </span>
            </h1>

            {/* Voice first.

                Low literacy is the norm among the farmers this is built for, and
                a page of English buttons excludes them by default. So the primary
                action is a large microphone that starts a spoken conversation in
                the farmer's own language, and the typed paths sit underneath it. */}
            <div className="flex flex-col items-center gap-4 mb-10">
              <Link
                to="/consult"
                aria-label="Ask a question by voice, in your own language"
                className="group relative inline-flex items-center gap-4 pl-6 pr-8 py-5 rounded-full
                           bg-[#63A361] text-white shadow-xl shadow-[#63A361]/30
                           hover:bg-[#4a8a4d] transition-colors"
              >
                <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-white/20">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-white/30 animate-ping opacity-60" />
                  <Mic className="relative w-7 h-7" />
                </span>
                <span className="text-left">
                  <span className="block text-lg font-bold leading-tight">
                    Bolkar poochhein
                  </span>
                  <span className="block text-sm text-white/80">
                    Ask by voice — 20 Indian languages
                  </span>
                </span>
                <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/monitor"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-bold text-[#5B532C] bg-white border-2 border-[#5B532C]/15 rounded-full hover:border-[#63A361]/40 hover:bg-[#FDE7B3]/30 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Photo se jaanchein
                </Link>

                <Link
                  to="/fields"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-bold text-[#5B532C] bg-white border-2 border-[#5B532C]/15 rounded-full hover:border-[#63A361]/40 hover:bg-[#FDE7B3]/30 transition-colors"
                >
                  Draw my field
                </Link>

                <Link
                  to="/research"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-bold text-[#5B532C] bg-white border-2 border-[#5B532C]/15 rounded-full hover:border-[#63A361]/40 hover:bg-[#FDE7B3]/30 transition-colors"
                >
                  View Architecture
                </Link>
              </div>
            </div>

            {/* Network scale, read live from /v1/surveillance/states */}
            <div className="flex items-center justify-center gap-8 sm:gap-12">
              {[
                { icon: TrendingUp, value: scale ? String(scale.states) : "—", label: "States live" },
                { icon: Shield, value: scale ? String(scale.districts) : "—", label: "Districts" },
                { icon: Users, value: scale ? compact(scale.farmersReached) : "—", label: "Farmers reached" },
                { icon: Leaf, value: scale ? String(scale.languages) : "—", label: "Languages", wide: true },
              ].map((s, i) => (
                <React.Fragment key={s.label}>
                  {i > 0 && (
                    <div className={`w-px h-10 bg-[#5B532C]/20 ${s.wide ? "hidden sm:block" : ""}`} />
                  )}
                  <div className={`items-center gap-2 ${s.wide ? "hidden sm:flex" : "flex"}`}>
                    <div className="w-10 h-10 rounded-full bg-[#63A361]/10 flex items-center justify-center">
                      <s.icon className="w-5 h-5 text-[#63A361]" />
                    </div>
                    <div className="text-left">
                      <div className="text-xl font-bold text-[#5B532C]">{s.value}</div>
                      <div className="text-xs text-[#5B532C]/50">{s.label}</div>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </motion.div>

          {/* Bottom Section - Hero Image with Feature Cards */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Feature Cards */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-4 order-2 lg:order-1"
            >
              {/* Feature Card 1 */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-white shadow-lg border border-[#5B532C]/10">
                <div className="w-12 h-12 rounded-xl bg-[#63A361]/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-[#63A361]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#5B532C] mb-1">Early Disease Detection</h3>
                  <p className="text-sm text-[#5B532C]/60">AI-powered crop monitoring identifies diseases 3 days before visible symptoms appear.</p>
                </div>
              </div>

              {/* Feature Card 2 */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-white shadow-lg border border-[#5B532C]/10">
                <div className="w-12 h-12 rounded-xl bg-[#FFC50F]/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-[#FFC50F]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#5B532C] mb-1">Real-Time Market Prices</h3>
                  <p className="text-sm text-[#5B532C]/60">Get live mandi rates across 12 states. Never sell your crops below market price.</p>
                </div>
              </div>

              {/* Feature Card 3 */}
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-white shadow-lg border border-[#5B532C]/10">
                <div className="w-12 h-12 rounded-xl bg-[#63A361]/10 flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-6 h-6 text-[#63A361]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#5B532C] mb-1">Yield Optimization</h3>
                  <p className="text-sm text-[#5B532C]/60">AI recommendations help you maximize yields and reduce input costs effectively.</p>
                </div>
              </div>
            </motion.div>

            {/* Right - Hero Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative order-1 lg:order-2"
            >
              <div className="relative">
                <img
                  src={heroImage}
                  alt="Kisaan Saathi Dashboard"
                  className="w-full max-w-lg mx-auto rounded-2xl shadow-2xl border-4 border-white"
                />

                {/* Floating Badge - Success Story */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-white rounded-full shadow-xl border border-[#5B532C]/10 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-[#63A361] flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-sm font-semibold text-[#5B532C]">
                    ₹2 Crore+ value unlocked for farmers
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Market Section */}
      <section className="border-t border-b border-[#5B532C]/10 bg-[#FDFCF8]">
        <Market />
      </section>

      {/* About Section */}
      {/* About Section */}
      <div className="py-4 bg-white">
        <About />
      </div>

      {/* CTA Section */}
      <div className="py-4 bg-white">
        <CTA />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Home;
