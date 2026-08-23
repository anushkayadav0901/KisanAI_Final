import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  Mic,
  Map,
  Sprout
} from 'lucide-react';

const entryPoints = [
  {
    icon: Camera,
    label: "Photograph a sick crop",
    hint: "AI diagnosis with visible reasoning",
    href: "/monitor",
  },
  {
    icon: Mic,
    label: "Just talk to it",
    hint: "Spoken consults in 20 Indian languages",
    href: "/consult",
  },
  {
    icon: Map,
    label: "Show it your field",
    hint: "Draw the boundary, get localised advice",
    href: "/fields",
  },
];

export const CTA = () => {
  return (
    <section className="py-24 bg-[#63A361] relative overflow-hidden">
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle, #ffffff 1.5px, transparent 1.5px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="relative px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white/90">
              <Sprout className="w-3.5 h-3.5" />
              Free · No sign-up · Works on any phone
            </span>

            <h2 className="text-4xl sm:text-5xl font-bold text-white mt-6 leading-tight">
              Three ways to <span className="text-[#FDE7B3]">start right now</span>
            </h2>

            <p className="text-white/70 mt-4 text-lg leading-relaxed">
              No account, no cost. Every diagnosis you make also strengthens the
              district-level early-warning picture for your whole area.
            </p>

            {/* Entry points */}
            <div className="grid sm:grid-cols-3 gap-4 mt-10">
              {entryPoints.map((entry) => (
                <Link
                  key={entry.href}
                  to={entry.href}
                  className="group p-5 rounded-2xl bg-white/10 border border-white/20 hover:bg-white hover:bg-opacity-100 transition-colors"
                >
                  <entry.icon className="w-6 h-6 text-[#FDE7B3] group-hover:text-[#63A361] transition-colors" />
                  <p className="text-white font-semibold text-sm mt-3 group-hover:text-[#5B532C] transition-colors">
                    {entry.label}
                  </p>
                  <p className="text-white/50 text-xs mt-1 group-hover:text-[#5B532C]/60 transition-colors">
                    {entry.hint}
                  </p>
                </Link>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-10">
              <Link
                to="/monitor"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold text-[#5B532C] bg-white rounded-full hover:bg-[#FDE7B3] transition-colors shadow-lg"
              >
                Open the Crop Doctor
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/command"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold text-white border border-white/30 rounded-full hover:bg-white/10 transition-colors"
              >
                See the state view
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
