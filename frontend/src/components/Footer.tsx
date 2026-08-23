import { Link } from 'react-router-dom';
import { Sprout, ExternalLink } from 'lucide-react';

const productLinks = [
  { label: "Crop Doctor", href: "/monitor", hint: "Photo diagnosis" },
  { label: "Voice Advisory", href: "/consult", hint: "20 languages" },
  { label: "My Fields", href: "/fields", hint: "Draw your plot" },
  { label: "State Command Centre", href: "/command", hint: "29-state surveillance" },
];

const networkLinks = [
  { label: "Open Data API", href: "/v1/docs", hint: "24 routes · no auth" },
  { label: "API Specification", href: "/v1/openapi.json", hint: "OpenAPI 3.0" },
  { label: "Advisory Sources", href: "/advisory", hint: "Every claim cited" },
  { label: "Data Rights", href: "/consent", hint: "Consent enforced" },
];

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#5B532C]">
      <div className="px-4 py-12 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-10 pb-10 border-b border-white/10">
          {           }
          <div>
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-[#63A361] rounded-xl flex items-center justify-center">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Kisan AI</span>
            </Link>
            <p className="text-white/40 text-xs mb-3 -mt-1 tracking-wide">Smart Farming Made Simple</p>
            <p className="text-white/50 text-sm leading-relaxed">
              A farmer photographs a sick crop; the whole country's defence gets
              smarter. One diagnosis at a time, district by district.
            </p>
            {                                                              }
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-xs font-semibold text-white/80">
              <span className="w-1.5 h-1.5 rounded-full bg-[#63A361] animate-pulse" />
              Built with Google AI — Gemini vision &amp; live voice
            </div>
          </div>

          {             }
          <div>
            <h4 className="text-sm font-bold text-white mb-4">For Farmers</h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href} className="group flex items-baseline gap-2">
                    <span className="text-sm text-white/70 group-hover:text-[#63A361] transition-colors">
                      {link.label}
                    </span>
                    <span className="text-xs text-white/30">{link.hint}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {                      }
          <div>
            <h4 className="text-sm font-bold text-white mb-4">The Open Network</h4>
            <ul className="space-y-3">
              {networkLinks.map((link) =>
                link.href.startsWith("/v1") ? (
                  <li key={link.href}>
                    <a href={link.href} target="_blank" rel="noreferrer" className="group flex items-baseline gap-2">
                      <span className="text-sm text-white/70 group-hover:text-[#63A361] transition-colors inline-flex items-center gap-1">
                        {link.label} <ExternalLink className="w-3 h-3 opacity-40" />
                      </span>
                      <span className="text-xs text-white/30">{link.hint}</span>
                    </a>
                  </li>
                ) : (
                  <li key={link.href}>
                    <Link to={link.href} className="group flex items-baseline gap-2">
                      <span className="text-sm text-white/70 group-hover:text-[#63A361] transition-colors">
                        {link.label}
                      </span>
                      <span className="text-xs text-white/30">{link.hint}</span>
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>

        {                }
        <div className="pt-8 mt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span className="text-xs text-white/35">© {currentYear} Kisan AI</span>
          <span className="text-xs text-white/35">
            Built for Build with AI: Code for Communities · Google Cloud × GDG India
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
