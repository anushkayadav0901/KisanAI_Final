import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Microscope, Brain, ShieldCheck, Image as ImageIcon, AlertTriangle, Clock, DollarSign, Thermometer } from 'lucide-react';

interface Diagram {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
}

const diagrams: Diagram[] = [
  {
    id: 'frames',
    title: 'Temporal Aggregation',
    description: 'Real-time frame analysis with temporal aggregation. YOLO segregation layer prevents frame spamming and F1 Score distortion. Confidence calculated via F1 Score and R² coefficient with 3-layer re-audit, cross-questioning validation, and data-backed confirmations.',
    icon: <Microscope className="w-5 h-5" />,
    image: '/diagrams/frames.png'
  },
  {
    id: 'a2a',
    title: 'A2A Agentic Architecture',
    description: 'Dual-agent system with bidirectional tool calling. Implements intent mapping, scope definition, and end-goal alignment. Features Web Search and Thinking tools with Chain-of-Thought reasoning for long-horizon agricultural planning.',
    icon: <Brain className="w-5 h-5" />,
    image: '/diagrams/a2a.png'
  },
  {
    id: 'hallucination',
    title: 'Hallucination Prevention',
    description: 'Multi-layer validation system addressing weak context engineering and absence of data backing. YOLO captures at 10ms intervals with coordinate mapping. Passes through context-engineered Vertex AI pipeline with feedback loops and clear outcome definitions.',
    icon: <ShieldCheck className="w-5 h-5" />,
    image: '/diagrams/hallucination.png'
  },
  {
    id: 'extraction',
    title: 'Computer Vision Pipeline',
    description: 'CNN-based pixel arrangement identification with YOLO8 for object detection and segmentation. Vision Transformers extract features for resource cluster detection. Supports NDVI analysis, multispectral imaging, and infrared bands for water stress detection.',
    icon: <ImageIcon className="w-5 h-5" />,
    image: '/diagrams/image%20extraction.png'
  }
];

const solutions = [
  {
    title: 'Intelligent Agent System',
    desc: 'Sarvam Indus dual-agent with intent mapping, scope definition, and tool calling for agricultural queries'
  },
  {
    title: 'Computer Vision Stack',
    desc: 'YOLO+CNN architecture with attribute extraction and pattern recognition for crop monitoring'
  },
  {
    title: 'Temporal Confidence Scoring',
    desc: 'F1 Score and R² determination with 3-layer re-audit to eliminate false positives'
  },
  {
    title: 'Context-Engineered AI',
    desc: 'Vertex AI pipeline with proper context engineering to prevent hallucinations and ensure accuracy'
  }
];

const stats = [
  { value: '₹1.1L Cr', label: 'Annual Financial Loss', sublabel: 'To inefficiencies in agriculture' },
  { value: '33%', label: 'Yield Wastage', sublabel: 'Lost to diseases & pests' },
  { value: '150+', label: 'Detected Risks', sublabel: 'Identifiable by our AI systems' },
  { value: '1:1162', label: 'Expert Shortage', sublabel: 'Ratio of advisors to farmers' }
];

const challenges = [
  {
    icon: <AlertTriangle className="w-6 h-6" />,
    title: 'The Detection Delay',
    stat: '15-30%',
    statLabel: 'Yield Lost',
    description: 'By the time a farmer spots a disease with the naked eye, 15% to 30% of potential yield is already lost. Early detection is not merely convenience; it is essential for survival.'
  },
  {
    icon: <Thermometer className="w-6 h-6" />,
    title: 'Weather Volatility',
    stat: '+0.56°C',
    statLabel: 'Temperature Rise',
    description: 'Temperatures have risen by 0.56°C, creating optimal conditions for sudden pest outbreaks that traditional farming calendars cannot predict.'
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: 'The Information Bottleneck',
    stat: '1-3 Weeks',
    statLabel: 'Lab Result Wait',
    description: 'Waiting 1-3 weeks for a rural lab result is impractical. A crop\'s health can deteriorate beyond recovery in just 48 hours.'
  },
  {
    icon: <DollarSign className="w-6 h-6" />,
    title: 'The Pricing Deficit',
    stat: '80%',
    statLabel: 'Value Lost',
    description: 'Farmers often lose up to 80% of potential consumer value to opaque middlemen margins. Produce sold for ₹3 frequently retails at ₹30.'
  }
];

const Research: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const openLightbox = (image: string, index: number) => {
    setSelectedImage(image);
    setCurrentIndex(index);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const nextImage = () => {
    const next = (currentIndex + 1) % diagrams.length;
    setCurrentIndex(next);
    setSelectedImage(diagrams[next].image);
  };

  const prevImage = () => {
    const prev = (currentIndex - 1 + diagrams.length) % diagrams.length;
    setCurrentIndex(prev);
    setSelectedImage(diagrams[prev].image);
  };

  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="px-4 mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-[#5B532C] mb-4">
            Research & <span className="text-[#63A361]">Implementation</span>
          </h1>
          <p className="text-lg text-[#5B532C]/60 max-w-2xl mx-auto">
            Technical architecture and data-driven solutions for systemic agricultural challenges.
          </p>
        </motion.div>

        {/* The Challenge Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-[#5B532C] mb-8 text-center">The Reality of Indian Agriculture</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (i + 1) }}
                className="p-6 rounded-2xl bg-gradient-to-br from-[#FDFCF8] to-white border border-[#5B532C]/10 text-center"
              >
                <div className="text-3xl font-bold text-[#63A361] mb-2">{stat.value}</div>
                <div className="text-sm font-semibold text-[#5B532C] mb-1">{stat.label}</div>
                <div className="text-xs text-[#5B532C]/50">{stat.sublabel}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Challenges Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-[#5B532C] mb-8 text-center">Core Challenges Addressed</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {challenges.map((challenge, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (i + 1) }}
                className="p-6 rounded-2xl bg-white border border-[#5B532C]/10 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#63A361]/10 flex items-center justify-center text-[#63A361] flex-shrink-0">
                    {challenge.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-[#5B532C]">{challenge.title}</h3>
                      <div className="text-right">
                        <div className="text-xl font-bold text-[#63A361]">{challenge.stat}</div>
                        <div className="text-xs text-[#5B532C]/50">{challenge.statLabel}</div>
                      </div>
                    </div>
                    <p className="text-sm text-[#5B532C]/60">{challenge.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Our Solutions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16 p-8 rounded-3xl bg-gradient-to-br from-[#63A361]/5 to-[#FDFCF8] border border-[#63A361]/20"
        >
          <h2 className="text-2xl font-bold text-[#5B532C] mb-8 text-center">What We Bring</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {solutions.map((solution, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (i + 1) }}
                className="p-5 rounded-xl bg-white border border-[#5B532C]/10"
              >
                <div className="text-sm font-bold text-[#63A361] mb-2">{solution.title}</div>
                <div className="text-xs text-[#5B532C]/70 leading-relaxed">{solution.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tech Stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16 p-8 rounded-3xl bg-gradient-to-br from-[#FDFCF8] to-white border border-[#5B532C]/10"
        >
          <h2 className="text-2xl font-bold text-[#5B532C] mb-6">Technical Architecture</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-white border border-[#5B532C]/10">
              <div className="text-sm font-semibold text-[#63A361] mb-2">Frontend</div>
              <div className="text-[#5B532C] text-sm">React Vite + TypeScript + tRPC + Zustand</div>
            </div>
            <div className="p-5 rounded-xl bg-white border border-[#5B532C]/10">
              <div className="text-sm font-semibold text-[#63A361] mb-2">Backend</div>
              <div className="text-[#5B532C] text-sm">Node Express + Python Proxy + SSE</div>
            </div>
            <div className="p-5 rounded-xl bg-white border border-[#5B532C]/10">
              <div className="text-sm font-semibold text-[#63A361] mb-2">AI/ML</div>
              <div className="text-[#5B532C] text-sm">Vertex AI + GPT OSS 120B + YOLO AgriNet</div>
            </div>
          </div>
        </motion.div>

        {/* Diagrams Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-[#5B532C] mb-8 text-center">Implementation Details</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {diagrams.map((diagram, index) => (
              <motion.div
                key={diagram.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
                className="group cursor-pointer"
                onClick={() => openLightbox(diagram.image, index)}
              >
                <div className="relative overflow-hidden rounded-2xl border border-[#5B532C]/10 bg-white shadow-sm hover:shadow-xl transition-shadow">
                  <div className="aspect-[16/9] overflow-hidden bg-[#FDFCF8]">
                    <img
                      src={diagram.image}
                      alt={diagram.title}
                      className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6 border-t border-[#5B532C]/10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-[#63A361]/10 flex items-center justify-center text-[#63A361]">
                        {diagram.icon}
                      </div>
                      <h3 className="text-lg font-bold text-[#5B532C]">{diagram.title}</h3>
                    </div>
                    <p className="text-sm text-[#5B532C]/60">{diagram.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Core Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { title: 'Agentic AI', desc: 'Intent mapping + scope definition with tool calling' },
            { title: 'Temporal Aggregation', desc: 'F1 Score & R² determination with re-audit' },
            { title: 'Hallucination Guard', desc: 'Context-engineered Vertex AI pipeline' },
            { title: 'Computer Vision', desc: 'YOLO8 + CNN with Vision Transformers' }
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-xl bg-[#63A361]/5 border border-[#63A361]/20">
              <div className="text-sm font-bold text-[#63A361] mb-1">{item.title}</div>
              <div className="text-xs text-[#5B532C]/70">{item.desc}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <button
              onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <motion.img
              key={selectedImage}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage}
              alt="Diagram"
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm">
              {diagrams[currentIndex].title} • {currentIndex + 1} / {diagrams.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Research;
