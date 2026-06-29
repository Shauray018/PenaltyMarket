import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Globe2, ShieldCheck, Trophy } from "lucide-react";
import { BetDialog } from "@/components/bet-dialog";
import { Providers } from "@/components/providers";
import { WalletButton } from "@/components/wallet-button";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";

export const metadata: Metadata = {
  title: {
    default: "PenaltyMarket",
    template: "%s | PenaltyMarket"
  },
  description: "Trustless World Cup prediction markets on Solana devnet",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png"
  },
  openGraph: {
    title: "PenaltyMarket",
    description: "Trustless World Cup prediction markets on Solana devnet",
    images: ["/logo.png"]
  },
  twitter: {
    card: "summary_large_image",
    title: "PenaltyMarket",
    description: "Trustless World Cup prediction markets on Solana devnet",
    images: ["/logo.png"]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="app-shell">
            <header className="topbar sticky top-0 z-30">
              <div className="mx-auto flex h-full max-w-[1470px] items-center justify-between gap-7 px-8">
                <Link href="/" className="flex shrink-0 items-center gap-2 text-xl font-black text-[var(--accent)]">
                  <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-black">
                    <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" priority />
                  </span>
                  PenaltyMarket
                </Link>
                <nav className="hidden items-center md:flex">
                 
                </nav>
                <div className="flex items-center gap-7 ">
                   <Link href="/" className="nav-link nav-link-active">
                    Markets
                  </Link>
                  <Link href="/portfolio" className="nav-link">
                    My Bets
                  </Link>
                  <WalletButton />
                </div>
              </div>
            </header>
            <main className="mx-auto max-w-[1470px] px-8 py-9">{children}</main>
            <BetDialog />
            <footer className="footer-shell mt-16">
              <div className="mx-auto grid max-w-[1470px] gap-10 px-5 py-12 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
                <div>
                  <div className="flex items-center gap-2 text-xl font-black text-[var(--accent)]">
                    <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-black">
                      <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
                    </span>
                    PenaltyMarket
                  </div>
                  <p className="mt-5 max-w-sm text-sm leading-6 text-[var(--muted)]">
                    The world's most playful soccer-themed Solana prediction market. Join the stadium and make your calls.
                  </p>
                  <div className="mt-8 flex gap-5 text-[var(--muted)]">
                    <Trophy className="h-4 w-4" />
                    <ShieldCheck className="h-4 w-4" />
                    <Globe2 className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-white/70">Product</h3>
                  <div className="mt-5 grid gap-3 text-sm font-bold text-[var(--muted)]">
                    <Link href="/">Markets</Link>
                    <span>Leaderboard</span>
                    <span>Referrals</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-white/70">Support</h3>
                  <div className="mt-5 grid gap-3 text-sm font-bold text-[var(--muted)]">
                    <span>FAQ</span>
                    <span>Terms of Service</span>
                    <span>Privacy Policy</span>
                  </div>
                </div>
                <div className="flex items-start justify-end">
                  <div className="rounded-[18px] border border-[#22282c] bg-black px-5 py-4 text-center">
                    <div className="text-xs font-black uppercase text-white/60">Powered by</div>
                    <div className="mt-2 font-black text-white">
                      <span className="mr-2 inline-block h-4 w-4 rounded-full bg-gradient-to-br from-[#49de79] to-[#8b5cf6] align-[-2px]" />
                      Solana
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
