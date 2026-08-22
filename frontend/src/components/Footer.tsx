import { Link } from 'react-router-dom';
import {
  Sprout,
  Mail,
  Phone,
  MapPin,
  Heart,
  ArrowUpRight
} from 'lucide-react';

const footerLinks = {
  product: [
    { label: "Disease Detection", href: "/monitor" },
    { label: "Market Insights", href: "/market" },
    { label: "Weather AI", href: "/consult" },
    { label: "Smart Farming", href: "/farming" },
  ],
  company: [
    { label: "About Us", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Press", href: "#" },
    { label: "Contact", href: "#" },
  ],
  resources: [
    { label: "Blog", href: "#" },
    { label: "Help Center", href: "#" },
    { label: "Community", href: "#" },
    { label: "API", href: "#" },
  ],
  legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Cookies", href: "#" },
  ]
};

const socialLinks = [
  { label: "X", icon: "𝕏" },
  { label: "LinkedIn", icon: "in" },
  { label: "Facebook", icon: "f" },
  { label: "Instagram", icon: "ig" },
];

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#5B532C]">
      <div className="px-4 py-16 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Top Section */}
        <div className="grid lg:grid-cols-2 gap-12 pb-12 border-b border-white/10">
          {/* Brand */}
          <div className="max-w-sm">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#63A361] rounded-xl flex items-center justify-center">
                <Sprout className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">Kisaan Saathi</span>
            </Link>
            <p className="text-white/50 leading-relaxed mb-6">
              AI-driven insights for better yields, disease detection, and market intelligence. Made in India.
            </p>
            {/* Contact Info */}
            <div className="space-y-3">
              <a href="mailto:hello@kisana.ai" className="flex items-center gap-3 text-sm text-white/50 hover:text-[#63A361] transition-colors group">
                <Mail className="w-4 h-4" />
                <span>hello@kisana.ai</span>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <a href="tel:+9118001234567" className="flex items-center gap-3 text-sm text-white/50 hover:text-[#63A361] transition-colors group">
                <Phone className="w-4 h-4" />
                <span>+91 1800-123-4567</span>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <div className="flex items-center gap-3 text-sm text-white/50">
                <MapPin className="w-4 h-4" />
                <span>Bangalore, Karnataka, India</span>
              </div>
            </div>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Product</h4>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-white/50 hover:text-[#63A361] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Company</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-white/50 hover:text-[#63A361] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Resources</h4>
              <ul className="space-y-3">
                {footerLinks.resources.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-white/50 hover:text-[#63A361] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-white/50 hover:text-[#63A361] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-white/40">
            <span>© {currentYear} Kisaan Saathi.</span>
            <Heart className="w-4 h-4 text-[#63A361] fill-[#63A361]" />
            <span>Made in India</span>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-2">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-[#63A361] hover:text-white text-sm font-bold transition-colors"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
