import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Sprout,
  Star,
  Quote
} from 'lucide-react';

const benefits = [
  "Free crop health analysis",
  "Real-time market prices",
  "7-day weather forecasts",
  "Direct buyer connections"
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
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - CTA Content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white/90">
                <Sprout className="w-3.5 h-3.5" />
                Start Free Today
              </span>

              <h2 className="text-4xl sm:text-5xl font-bold text-white mt-6 leading-tight">
                Ready to Transform Your <span className="text-[#FDE7B3]">Farming?</span>
              </h2>

              <p className="text-white/70 mt-4 text-lg leading-relaxed">
                Join 50,000+ farmers using Kisaan Saathi to increase yields and get better prices for their crops.
              </p>

              {/* Benefits */}
              <div className="grid sm:grid-cols-2 gap-3 mt-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white/90 text-sm">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-10">
                <Link
                  to="/consult"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold text-[#5B532C] bg-white rounded-full hover:bg-[#FDE7B3] transition-colors shadow-lg"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/market"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold text-white border border-white/30 rounded-full hover:bg-white/10 transition-colors"
                >
                  View Marketplace
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Right - Testimonial Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="bg-white rounded-3xl p-8 relative">
              {/* Quote Icon */}
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-[#FFC50F] rounded-2xl flex items-center justify-center shadow-lg">
                <Quote className="w-6 h-6 text-white" />
              </div>

              {/* Stars */}
              <div className="flex gap-1 mb-4 pt-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-[#FFC50F] fill-[#FFC50F]" />
                ))}
              </div>

              <blockquote className="text-[#5B532C] text-lg leading-relaxed mb-6">
                "Kisaan Saathi detected a fungal infection in my wheat crop 3 days before visible symptoms. I saved 80% of my yield and avoided a ₹2 lakh loss."
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4 pt-6 border-t border-[#5B532C]/10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#63A361] to-[#5B532C] flex items-center justify-center text-white font-bold text-lg">
                  RS
                </div>
                <div>
                  <div className="font-bold text-[#5B532C]">Ramesh Singh</div>
                  <div className="text-sm text-[#5B532C]/50">Wheat Farmer, Punjab</div>
                </div>
              </div>
            </div>

            {/* Floating Stats */}
            <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl p-4 shadow-xl border border-[#5B532C]/10">
              <div className="flex items-center gap-4">
                <div className="text-center px-4 border-r border-[#5B532C]/10">
                  <div className="text-2xl font-bold text-[#63A361]">50K+</div>
                  <div className="text-xs text-[#5B532C]/50">Farmers</div>
                </div>
                <div className="text-center px-4">
                  <div className="text-2xl font-bold text-[#63A361]">95%</div>
                  <div className="text-xs text-[#5B532C]/50">Happy</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
