import React from "react";
import { NavLink } from "react-router-dom";
import { Menu, X, Sprout, Globe, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../hooks/useLanguage";

const navItems = [
  { path: "/monitor", label: "Monitor" },
  { path: "/consult", label: "Consult" },
  { path: "/market", label: "Market" },
  { path: "/farming", label: "Farming" },
  { path: "/fields", label: "Fields" },
  { path: "/advisory", label: "Advisory" },
  { path: "/consent", label: "My Data" },
  { path: "/command", label: "Command" },
];

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { selected, open, search, setSearch, dropRef, pick, toggle, filtered } =
    useLanguage();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
      <div className="flex justify-center">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex items-center h-14 px-2 bg-white/90 backdrop-blur-xl rounded-full shadow-lg shadow-[#5B532C]/10 border border-[#5B532C]/10"
        >
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 px-3">
            <div className="w-9 h-9 bg-[#63A361] rounded-lg flex items-center justify-center">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-bold text-[#5B532C]">
              Kisan AI
            </span>
          </NavLink>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 px-5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                    isActive
                      ? "text-white bg-[#63A361]"
                      : "text-[#5B532C]/70 hover:text-[#5B532C] hover:bg-[#FDE7B3]/50"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-6 bg-[#5B532C]/15 mx-1" />

          {/* Language globe icon + dropdown */}
          <div ref={dropRef} className="relative hidden md:block">
            <button
              onClick={toggle}
              className="flex items-center justify-center w-9 h-9 rounded-full text-[#5B532C]/70 hover:text-[#63A361] hover:bg-[#FDE7B3]/50 transition-colors"
              title={`Language: ${selected.native}`}
            >
              <Globe className="w-[18px] h-[18px]" />
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#5B532C]/15 overflow-hidden z-[200]"
                >
                  {/* Search */}
                  <div className="p-2 border-b border-[#5B532C]/10">
                    <input
                      type="text"
                      placeholder="Search language..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs text-[#5B532C] bg-[#FDE7B3]/20 border border-[#5B532C]/15 rounded-lg outline-none focus:border-[#63A361]/50 placeholder-[#5B532C]/40"
                      autoFocus
                    />
                  </div>
                  {/* Language list */}
                  <div className="max-h-60 overflow-y-auto py-1">
                    {filtered.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => pick(lang)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#FDE7B3]/30 transition-colors ${
                          selected.code === lang.code ? "bg-[#63A361]/8" : ""
                        }`}
                      >
                        <div>
                          <span className="text-sm font-semibold text-[#5B532C]">
                            {lang.native}
                          </span>
                          <span className="text-xs text-[#5B532C]/50 ml-1.5">
                            {lang.name}
                          </span>
                        </div>
                        {selected.code === lang.code && (
                          <Check className="w-3.5 h-3.5 text-[#63A361] shrink-0" />
                        )}
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <p className="px-3 py-4 text-xs text-[#5B532C]/40 text-center">
                        No languages found
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CTA Button */}
          <NavLink
            to="/consult"
            className="hidden md:flex items-center gap-2 px-5 py-2 ml-1 text-sm font-semibold text-white bg-[#63A361] rounded-full hover:bg-[#4a8a4d] transition-colors shadow-md shadow-[#63A361]/20"
          >
            Get Started
          </NavLink>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-[#5B532C] hover:bg-[#FDE7B3]/50 rounded-full transition-colors"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </motion.div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden mx-4 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-[#5B532C]/10 overflow-hidden"
          >
            <div className="p-4 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `block px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                      isActive
                        ? "text-white bg-[#63A361]"
                        : "text-[#5B532C]/70 hover:bg-[#FDE7B3]/50"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              {/* Mobile divider */}
              <div className="h-px bg-[#5B532C]/10 my-1" />

              {/* Mobile language picker */}
              <div ref={dropRef} className="relative">
                <button
                  onClick={toggle}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#5B532C]/70 hover:bg-[#FDE7B3]/50 rounded-xl transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span>{selected.native}</span>
                  <span className="text-[#5B532C]/40 text-xs">
                    ({selected.name})
                  </span>
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden rounded-xl border border-[#5B532C]/10 mt-1"
                    >
                      <div className="p-2 border-b border-[#5B532C]/10">
                        <input
                          type="text"
                          placeholder="Search language..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs text-[#5B532C] bg-[#FDE7B3]/20 border border-[#5B532C]/15 rounded-lg outline-none focus:border-[#63A361]/50 placeholder-[#5B532C]/40"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto py-1">
                        {filtered.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              pick(lang);
                              setIsOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#FDE7B3]/30 transition-colors ${
                              selected.code === lang.code
                                ? "bg-[#63A361]/8"
                                : ""
                            }`}
                          >
                            <div>
                              <span className="text-sm font-semibold text-[#5B532C]">
                                {lang.native}
                              </span>
                              <span className="text-xs text-[#5B532C]/50 ml-1.5">
                                {lang.name}
                              </span>
                            </div>
                            {selected.code === lang.code && (
                              <Check className="w-3.5 h-3.5 text-[#63A361] shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <NavLink
                to="/consult"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 text-sm font-semibold text-center text-white bg-[#63A361] rounded-xl"
              >
                Get Started
              </NavLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
