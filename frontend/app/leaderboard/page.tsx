import { Medal, Trophy } from "lucide-react";
import { ComingSoonOverlay } from "@/components/coming-soon-overlay";

const rows = [
  { name: "SolStriker", payout: "452.8 SOL", winRate: "68%", streak: "W5" },
  { name: "CryptoKeeper", payout: "381.3 SOL", winRate: "63%", streak: "W3" },
  { name: "GoalGetter", payout: "324.6 SOL", winRate: "59%", streak: "L1" },
  { name: "ChainRef", payout: "288.1 SOL", winRate: "57%", streak: "W2" },
  { name: "CornerKick", payout: "241.9 SOL", winRate: "54%", streak: "W1" },
  { name: "VARWizard", payout: "208.4 SOL", winRate: "51%", streak: "L2" }
];

export default function LeaderboardPage() {
  return (
    <ComingSoonOverlay>
      <div className="grid gap-3">
      <section className="win95-window">
        <div className="win95-titlebar">
          <span>LEADERBOARD.EXE</span>
          <span className="text-[10px] font-black">ARCADE MODE</span>
        </div>
        <div className="win95-window-body">
          <div className="win95-panel-inset bg-[#050505] p-4 text-[#39ff6a]">
            <div className="flex items-center justify-center gap-2 text-center text-xl font-black uppercase">
              <Trophy className="h-6 w-6 text-[var(--warning)]" />
              Top Refs
            </div>
            <div className="mt-3 grid grid-cols-4 border-b border-[#39ff6a]/50 pb-2 text-[10px] font-black uppercase">
              <span>Rank</span>
              <span>Name</span>
              <span>Payout</span>
              <span>Win%</span>
            </div>
            <div className="grid">
              {rows.map((row, index) => (
                <div
                  className="grid grid-cols-4 items-center gap-1 border-b border-[#39ff6a]/20 py-2 text-xs font-black"
                  key={row.name}
                >
                  <span className="flex items-center gap-1">
                    {index < 3 && <Medal className="h-4 w-4 text-[var(--warning)]" />}
                    #{index + 1}
                  </span>
                  <span className="truncate">{row.name}</span>
                  <span className="truncate">{row.payout}</span>
                  <span>{row.winRate}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="win95-window">
        <div className="win95-titlebar">
          <span>FORM_GUIDE.DAT</span>
        </div>
        <div className="win95-window-body grid grid-cols-3 gap-2">
          <ScoreStat label="Biggest Pool" value="2,500 SOL" />
          <ScoreStat label="Best Streak" value="W5" />
          <ScoreStat label="Claim Rate" value="100%" />
        </div>
      </section>
      </div>
    </ComingSoonOverlay>
  );
}

function ScoreStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="win95-panel-inset bg-white p-2 text-center">
      <div className="text-lg font-black text-[#000080]">{value}</div>
      <div className="text-[10px] font-black uppercase text-[var(--muted)]">{label}</div>
    </div>
  );
}
