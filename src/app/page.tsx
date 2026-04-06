import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import WaitlistForm from "./_components/WaitlistForm";
import DashboardMockup from "./_components/DashboardMockup";
import ScrollReveal from "./_components/ScrollReveal";
import { Activity, BellRing, GitMerge, Shield, Zap, RefreshCcw, Eye, ArrowRight, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

async function getWaitlistCount(): Promise<number> {
  try {
    const { db } = await import("@/lib/db");
    return await db.waitlistEntry.count();
  } catch {
    return 0;
  }
}

export const metadata = {
  title: "Radar — AI Leadership OS",
  description:
    "Radar reads your team's work signals to surface quiet risks before they become surprises.",
};

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/check-in");
  const count = await getWaitlistCount();
  const displayCount = count > 50 ? `${Math.floor(count / 50) * 50}+` : "500+";

  return (
    <div className="relative min-h-screen bg-background overflow-hidden selection:bg-white/20">
      <div className="noise-bg" />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/50 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.2)]">
              <div className="w-3 h-3 rounded-full bg-black" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">Radar</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/60">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Sign in</a>
            <a href="#waitlist" className="text-sm font-bold bg-white text-black px-4 py-2 rounded-lg hover:scale-105 transition-transform">
              Get Access
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-6 z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(255,255,255,0.06)_0%,transparent_100%)] pointer-events-none" />
        
        <div className="max-w-5xl text-center flex flex-col items-center relative z-10">
          <ScrollReveal delay={100}>
            <div className="section-label mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Intelligence Layer for Leadership
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-[-0.04em] leading-[1.05] mb-6 drop-shadow-2xl text-white">
              Stop being the
              <br />
              <span className="gradient-text-hero">last to know.</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
              Radar watches GitHub, Slack, and Jira to tell you when someone is struggling, blocked, or burning out — <strong className="text-white font-medium">before the 1:1.</strong>
            </p>
          </ScrollReveal>

          <ScrollReveal delay={400}>
            <div id="waitlist" className="w-full max-w-md mx-auto relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 to-white/0 rounded-xl blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
              <div className="relative relative p-1 rounded-xl bg-black border border-white/10 glass-panel">
                <WaitlistForm />
              </div>
              <p className="mt-4 text-xs text-white/40 font-mono text-center tracking-wide">JOINED BY {displayCount} ENG LEADERS</p>
            </div>
          </ScrollReveal>
        </div>

        {/* Dashboard floating */}
        <ScrollReveal delay={600} className="w-full max-w-5xl mt-24 relative z-20">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-b from-white/10 to-transparent rounded-2xl blur-xl opacity-50" />
            <DashboardMockup />
          </div>
        </ScrollReveal>
        
        {/* Glow behind dash */}
        <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      </section>

      <div className="divider w-full" />

      {/* THE PROBLEM / HOW IT WORKS */}
      <section id="how-it-works" className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-start">
            
            {/* Sticky Left */}
            <div className="md:sticky md:top-32">
              <ScrollReveal>
                <div className="section-label mb-6">The Quiet Crisis</div>
                <h2 className="font-display text-4xl md:text-5xl font-bold tracking-[-0.03em] leading-tight mb-6">
                  Your team is sending signals.<br/>
                  <span className="text-white/40">You're missing them.</span>
                </h2>
                <p className="text-white/60 text-lg leading-relaxed max-w-md">
                  Surveys rely on honest answers. Check-ins require context. Radar analyzes ambient data to find the silent blockers before they surface in an exit interview.
                </p>
              </ScrollReveal>
            </div>

            {/* Scrolling Right */}
            <div className="flex flex-col gap-6">
              {[
                { title: "The Quiet Performer", icon: <Activity className="w-5 h-5 text-emerald-400" />, prob: "Commits drop 80%. Slack goes silent.", res: "Radar detects the anomaly on day 2." },
                { title: "The Silent Blocker", icon: <GitMerge className="w-5 h-5 text-amber-400" />, prob: "Ticket in-progress for 11 days. No PR.", res: "Radar alerts you to the stalled momentum." },
                { title: "Meeting Debt", icon: <BellRing className="w-5 h-5 text-rose-400" />, prob: "8h meeting load. Skipping lunch to code.", res: "Radar identifies imminent burnout." }
              ].map((card, i) => (
                <ScrollReveal key={i} delay={i * 150}>
                  <div className="glass-card p-8 group">
                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      {card.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{card.title}</h3>
                    <div className="text-sm text-white/50 mb-3 p-3 bg-white/5 rounded-md border-l-2 border-white/10">
                      <span className="block text-[10px] font-mono tracking-widest uppercase mb-1">Old Way</span>
                      {card.prob}
                    </div>
                    <div className="text-sm font-medium text-emerald-100 p-3 bg-emerald-500/10 rounded-md border-l-2 border-emerald-500">
                      <span className="block text-[10px] font-mono tracking-widest text-emerald-500 uppercase mb-1">With Radar</span>
                      {card.res}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

          </div>
        </div>
      </section>

      <div className="divider w-full max-w-7xl mx-auto" />

      {/* FEATURES ARCHITECTURE */}
      <section id="features" className="py-32 px-6 relative z-10">
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-20">
             <div className="section-label mb-6">Capabilities</div>
             <h2 className="font-display text-4xl md:text-5xl font-bold tracking-[-0.03em] leading-tight">
               Built for modern orgs.
             </h2>
          </div>
        </ScrollReveal>

        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { title: "Pulse Brief", icon: <RefreshCcw className="w-6 h-6 text-white" />, desc: "Every morning, a ranked list of who needs attention." },
            { title: "Value Score", icon: <Zap className="w-6 h-6 text-white" />, desc: "Tasks scored automatically by AI on speed and complexity." },
            { title: "Zero Install", icon: <Eye className="w-6 h-6 text-white" />, desc: "Runs silently on your existing OAuth connections." },
            { title: "Privacy First", icon: <Shield className="w-6 h-6 text-white" />, desc: "Analyzes patterns, never content. No screen recording." }
          ].map((f, i) => (
             <ScrollReveal key={i} delay={i * 100} className={i === 0 ? "md:col-span-2" : i === 3 ? "md:col-span-2" : ""}>
               <div className="glass-card h-full p-8 md:p-10 hover:bg-white/[0.05] relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="w-12 h-12 rounded-xl border border-white/20 bg-white/5 flex items-center justify-center mb-8">
                   {f.icon}
                 </div>
                 <h3 className="text-2xl font-bold mb-3">{f.title}</h3>
                 <p className="text-white/60 text-lg leading-relaxed">{f.desc}</p>
                 <ArrowRight className="absolute bottom-10 right-10 w-6 h-6 text-white/20 group-hover:text-white/60 transition-colors" />
               </div>
             </ScrollReveal>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 px-6 relative z-10 text-center">
         <ScrollReveal>
           <h2 className="font-display text-5xl md:text-7xl font-bold tracking-[-0.04em] mb-8">
             Access the <span className="text-accent-amber">Radar</span> beta.
           </h2>
           <p className="text-xl text-white/50 max-w-xl mx-auto mb-10">
             First team connections are free. <br/>Setup takes under 10 minutes.
           </p>
           <div className="w-full max-w-sm mx-auto">
             <WaitlistForm />
           </div>
         </ScrollReveal>
      </section>

    </div>
  );
}
