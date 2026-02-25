/**
 * Home Page — UI / Presentation
 * Follows the same design language as onboarding steps 1-8,
 * profile page, login/signup — Playfair Display headings,
 * font-medium weight, lowercase, max-w-md centered layout.
 * 
 * Apple iOS Core App Colors:
 * - System Blue (#0066CC) for interactive elements
 * - System Green (#34C759) for success/verified
 * - Athens Gray (#F5F5F7) for card backgrounds
 * - Shark (#1D1D1F) for dark surfaces
 *
 * Logic stays in logic.ts — zero changes there.
 */
import { useHomeLogic } from "./logic";
import HushhTechHeader from "../../components/hushh-tech-header/HushhTechHeader";
import HushhTechFooter, {
  HushhFooterTab,
} from "../../components/hushh-tech-footer/HushhTechFooter";
import HushhTechCta, {
  HushhTechCtaVariant,
} from "../../components/hushh-tech-cta/HushhTechCta";

/* ── Consistent heading style (same as onboarding/profile) ── */
const playfair = { fontFamily: "'Playfair Display', serif" };

export default function HomePage() {
  const { session, primaryCTA, onNavigate } = useHomeLogic();

  return (
    <div
      data-page="home"
      className="bg-white antialiased text-gray-900 min-h-screen flex flex-col relative selection:bg-hushh-blue selection:text-white"
    >
      {/* ═══ Header ═══ */}
      <HushhTechHeader
        fixed={false}
        className="sticky top-0 z-50 border-b border-transparent"
      />

      {/* ═══ Main Content — max-w-md centered like all other pages ═══ */}
      <main className="flex-1 px-6 pb-32 flex flex-col gap-12 pt-4 max-w-md mx-auto w-full">

        {/* ── Hero ── */}
        <section className="py-4">
          <div className="inline-block px-3 py-1 mb-5 border border-hushh-blue/20 rounded-full bg-hushh-blue/5">
            <span className="text-[10px] tracking-widest uppercase font-medium text-hushh-blue flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-hushh-blue rounded-full" />
              ai-powered investing
            </span>
          </div>
          <h1
            className="text-[2.25rem] leading-[1.15] font-medium text-black tracking-tight"
            style={playfair}
          >
            investing in <br /> the{" "}
            <span className="italic text-hushh-blue">future.</span>
          </h1>
          <p className="text-gray-500 text-sm font-light mt-3 leading-relaxed max-w-sm lowercase">
            the world's first ai-powered berkshire hathaway. merging rigorous
            data science with human wisdom.
          </p>
        </section>

        {/* ── Feature Cards (AI-Powered / Human-Led) ── */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-ios-gray-bg p-5 rounded-2xl border border-gray-200/60 flex flex-col justify-between min-h-[180px] hover:border-hushh-blue/30 transition-colors">
            <span className="material-symbols-outlined thin-icon text-3xl mb-4 text-hushh-blue">
              neurology
            </span>
            <div>
              <h3
                className="text-lg font-medium mb-1 lowercase"
                style={playfair}
              >
                ai-powered
              </h3>
              <p className="text-xs text-gray-500 font-light leading-relaxed lowercase">
                institutional analytics processing millions of signals.
              </p>
            </div>
          </div>
          <div className="bg-ios-gray-bg p-5 rounded-2xl border border-gray-200/60 flex flex-col justify-between min-h-[180px] hover:border-hushh-blue/30 transition-colors">
            <span className="material-symbols-outlined thin-icon text-3xl mb-4 text-ios-dark">
              supervised_user_circle
            </span>
            <div>
              <h3
                className="text-lg font-medium mb-1 lowercase"
                style={playfair}
              >
                human-led
              </h3>
              <p className="text-xs text-gray-500 font-light leading-relaxed lowercase">
                seasoned oversight ensuring long-term strategic vision.
              </p>
            </div>
          </div>
        </section>

        {/* ── Primary CTAs ── */}
        <section className="flex flex-col gap-3">
          <HushhTechCta
            onClick={primaryCTA.action}
            disabled={primaryCTA.loading}
            variant={HushhTechCtaVariant.BLACK}
          >
            {primaryCTA.text}
            <span className="material-symbols-outlined thin-icon text-lg">arrow_forward</span>
          </HushhTechCta>
          <HushhTechCta
            onClick={() => onNavigate("/discover-fund-a")}
            variant={HushhTechCtaVariant.WHITE}
          >
            discover fund a
          </HushhTechCta>
        </section>

        {/* ── Trust strip (same pattern as NWS strip on profile) ── */}
        <section className="border-t border-b border-gray-100 py-5 flex justify-center items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined thin-icon text-lg text-ios-green">
              verified_user
            </span>
            <span className="text-[10px] font-medium tracking-widest uppercase text-gray-400">
              sec registered
            </span>
          </div>
          <div className="w-1 h-1 bg-gray-300 rounded-full" />
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined thin-icon text-lg text-hushh-blue">
              lock
            </span>
            <span className="text-[10px] font-medium tracking-widest uppercase text-gray-400">
              bank level security
            </span>
          </div>
        </section>

        {/* ── The Hushh Advantage ── */}
        <section>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2 font-medium">why hushh</p>
          <h2
            className="text-2xl font-medium mb-8 tracking-tight lowercase"
            style={playfair}
          >
            the hushh advantage
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10">
            {[
              { icon: "analytics", color: "text-hushh-blue", bg: "bg-hushh-blue/10", title: "data driven", desc: "decisions based on facts, not emotions." },
              { icon: "savings", color: "text-ios-green", bg: "bg-ios-green/10", title: "low fees", desc: "more of your returns stay in your pocket." },
              { icon: "workspace_premium", color: "text-ios-yellow", bg: "bg-ios-yellow/10", title: "expert vetted", desc: "top-tier financial minds at work." },
              { icon: "autorenew", color: "text-hushh-blue", bg: "bg-hushh-blue/10", title: "automated", desc: "set it and forget it peace of mind." },
            ].map((item) => (
              <div key={item.icon} className="flex flex-col items-center text-center gap-3">
                <div className={`w-12 h-12 rounded-full border border-gray-200/60 flex items-center justify-center ${item.bg}`}>
                  <span className={`material-symbols-outlined thin-icon ${item.color}`}>{item.icon}</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1 lowercase">{item.title}</h4>
                  <p className="text-[11px] text-gray-500 font-light max-w-[120px] mx-auto lowercase">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Fund A Card ── */}
        <section className="relative mt-4">
          <div className="bg-ios-dark text-white p-8 rounded-2xl relative overflow-hidden shadow-2xl">
            {/* Glow effects — Apple blue accent */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-hushh-blue/15 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-hushh-blue/5 to-transparent" />

            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-medium tracking-widest uppercase text-white/50 mb-1 block">
                    flagship product
                  </span>
                  <h2
                    className="text-3xl font-medium lowercase"
                    style={playfair}
                  >
                    fund a
                  </h2>
                </div>
                <span className="bg-hushh-blue/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider border border-hushh-blue/30 text-hushh-blue">
                  high growth
                </span>
              </div>

              <div className="space-y-4 my-2">
                <div>
                  <span className="text-xs text-white/50 block mb-1 lowercase">target net irr</span>
                  <span className="text-4xl font-mono font-light tracking-tighter text-ios-green">
                    18-23%
                  </span>
                </div>
                <div>
                  <span className="text-xs text-white/50 block mb-1 lowercase">inception year</span>
                  <span className="font-mono text-xl">2024</span>
                </div>
              </div>

              <div
                className="pt-4 border-t border-white/10 flex items-center justify-between group cursor-pointer"
                onClick={() => onNavigate("/discover-fund-a")}
                role="button"
                tabIndex={0}
                aria-label="View performance details"
                onKeyDown={(e) => { if (e.key === 'Enter') onNavigate("/discover-fund-a"); }}
              >
                <span className="text-xs font-medium tracking-wide uppercase text-hushh-blue">
                  performance details
                </span>
                <span className="material-symbols-outlined thin-icon text-sm text-hushh-blue group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Feature Grid ── */}
        <section>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: "rocket_launch", color: "text-hushh-blue", title: "high growth", desc: "accelerated returns strategy" },
              { icon: "pie_chart", color: "text-ios-yellow", title: "diversified", desc: "multi-sector allocation" },
              { icon: "trending_up", color: "text-ios-green", title: "liquid", desc: "quarterly redemption windows" },
              { icon: "security", color: "text-hushh-blue", title: "secure", desc: "regulated custodian assets" },
            ].map((item) => (
              <div key={item.icon} className="bg-ios-gray-bg border border-gray-200/60 p-4 rounded-2xl hover:border-hushh-blue/30 transition-colors">
                <span className={`material-symbols-outlined thin-icon ${item.color} mb-2`}>
                  {item.icon}
                </span>
                <h5 className="font-medium text-sm lowercase">{item.title}</h5>
                <p className="text-[10px] text-gray-500 font-light lowercase">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bottom CTAs ── */}
        <section className="flex flex-col gap-3 py-6">
          <HushhTechCta
            onClick={() => onNavigate("/discover-fund-a")}
            variant={HushhTechCtaVariant.BLACK}
          >
            explore our approach
            <span className="material-symbols-outlined thin-icon text-lg">arrow_right_alt</span>
          </HushhTechCta>
          <HushhTechCta
            onClick={() => onNavigate("/community")}
            variant={HushhTechCtaVariant.WHITE}
          >
            learn more
          </HushhTechCta>
        </section>

        {/* ── Disclaimer ── */}
        <footer className="mb-8">
          <p
            className="text-[10px] text-gray-400 text-center leading-relaxed italic max-w-xs mx-auto lowercase"
            style={playfair}
          >
            investing involves risk, including possible loss of principal. past
            performance does not guarantee future results. hushh technologies is
            an sec registered investment advisor.
          </p>
        </footer>
      </main>

      {/* ═══ Footer Nav ═══ */}
      <HushhTechFooter
        activeTab={HushhFooterTab.HOME}
        onTabChange={(tab) => {
          if (tab === HushhFooterTab.HOME) onNavigate("/");
          if (tab === HushhFooterTab.FUND_A) onNavigate("/discover-fund-a");
          if (tab === HushhFooterTab.COMMUNITY) onNavigate("/community");
          if (tab === HushhFooterTab.PROFILE) onNavigate("/profile");
        }}
      />
    </div>
  );
}
