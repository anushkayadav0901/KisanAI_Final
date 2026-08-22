import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Leaf, TrendingUp, Users, Shield, CheckCircle2 } from 'lucide-react';
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

export const Home: React.FC = () => {
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

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
              <Link
                to="/monitor"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold text-white bg-[#63A361] rounded-full hover:bg-[#4a8a4d] transition-colors shadow-lg shadow-[#63A361]/25"
              >
                <Play className="w-4 h-4" />
                Try Monitoring
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/research"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold text-[#5B532C] bg-white border-2 border-[#5B532C]/15 rounded-full hover:border-[#63A361]/40 hover:bg-[#FDE7B3]/30 transition-colors"
              >
                View Architecture
              </Link>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-center gap-8 sm:gap-12">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#63A361]/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#63A361]" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold text-[#5B532C]">95%</div>
                  <div className="text-xs text-[#5B532C]/50">Accuracy</div>
                </div>
              </div>
              <div className="w-px h-10 bg-[#5B532C]/20"></div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#63A361]/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#63A361]" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold text-[#5B532C]">50K+</div>
                  <div className="text-xs text-[#5B532C]/50">Farmers</div>
                </div>
              </div>
              <div className="w-px h-10 bg-[#5B532C]/20 hidden sm:block"></div>
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#63A361]/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#63A361]" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold text-[#5B532C]">12</div>
                  <div className="text-xs text-[#5B532C]/50">States</div>
                </div>
              </div>
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
