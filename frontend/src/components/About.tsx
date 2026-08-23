import { motion } from 'framer-motion';
import {
  HeartCrack,
  CloudLightning,
  Hourglass,
  TrendingDown,
  ArrowUpRight
} from 'lucide-react';

const values = [
  {
    icon: HeartCrack,
    title: "The Detection Delay",
    description: "By the time a farmer spots a disease with the naked eye, 15% to 30% of potential yield is already lost. Early detection isn't just convenience; it's survival."
  },
  {
    icon: CloudLightning,
    title: "Weather Volatility",
    description: "Temperatures have risen by 0.56°C, creating 'perfect storms' for sudden pest outbreaks that traditional farming calendars simply cannot predict."
  },
  {
    icon: Hourglass,
    title: "The Information Bottleneck",
    description: "Waiting 1-3 weeks for a rural lab result is a luxury farmers don't have. A crop's health can deteriorate beyond recovery in just 48 hours."
  },
  {
    icon: TrendingDown,
    title: "The Pricing Deficit",
    description: "Farmers often lose up to 80% of the potential consumer value to opaque middlemen margins. Produce sold for ₹3 frequently retails at ₹30."
  }
];

const stats = [
  { value: "146M", label: "Farm Households", sublabel: "Small & marginal holders across India" },
  { value: "33%", label: "Crop Loss", sublabel: "Attributed to pests & diseases" },
  { value: "29", label: "States Covered", sublabel: "On the surveillance network day one" },
  { value: "20", label: "Languages", sublabel: "Advisories in the farmer's own tongue" },
];

export const About = () => {
  return (
    <section className="py-24 bg-[#FDFCF8]">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="grid lg:grid-cols-2 gap-12 items-end mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-xs font-semibold text-[#63A361] uppercase tracking-wider">The Challenge</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#5B532C] mt-3 leading-tight">
              The Reality of <span className="text-[#63A361]">Indian Agriculture</span>
            </h2>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[#5B532C]/60 leading-relaxed lg:text-right"
          >
            Indian farmers fight a constant battle against biology, climate, and opaque markets.
            We built Kisan AI to solve these exact systemic problems at scale.
          </motion.p>
        </div>

        {/* Stats - Horizontal Line */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-12 border-y border-[#5B532C]/10 mb-16"
        >
          {stats.map((stat, index) => (
            <div key={index} className="text-center lg:text-left">
              <div className="text-4xl font-bold text-[#5B532C] mb-1">{stat.value}</div>
              <div className="text-sm font-medium text-[#5B532C]">{stat.label}</div>
              <div className="text-xs text-[#5B532C]/50 mt-0.5">{stat.sublabel}</div>
            </div>
          ))}
        </motion.div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 gap-6">
          {values.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-6 bg-white rounded-2xl border border-[#5B532C]/10 hover:border-[#63A361]/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#63A361]/10 flex items-center justify-center">
                  <value.icon className="w-6 h-6 text-[#63A361]" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-[#5B532C]/30 group-hover:text-[#63A361] transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-[#5B532C] mb-2">{value.title}</h3>
              <p className="text-sm text-[#5B532C]/60 leading-relaxed">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default About;
