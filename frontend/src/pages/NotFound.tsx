import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export const NotFound = () => (
  <div className="min-h-screen bg-white pt-32 pb-16 px-4">
    <div className="max-w-md mx-auto text-center">
      <div className="w-16 h-16 mx-auto mb-5 bg-[#FDE7B3]/40 rounded-2xl flex items-center justify-center border border-[#5B532C]/10">
        <Compass className="w-8 h-8 text-[#63A361]" />
      </div>
      <h1 className="text-3xl font-bold text-[#5B532C]">Page not found</h1>
      <p className="text-sm text-[#5B532C]/60 mt-3">
        <span className="font-mono text-[#5B532C]/80">
          {window.location.pathname}
        </span>{" "}
        does not exist. It may have been renamed or mistyped.
      </p>
      <Link
        to="/"
        className="inline-block mt-7 px-6 py-3 text-sm font-semibold text-white
                   bg-[#63A361] rounded-full hover:bg-[#4a8a4d] transition-colors
                   shadow-md shadow-[#63A361]/20"
      >
        Back to home
      </Link>
    </div>
  </div>
);

export default NotFound;
