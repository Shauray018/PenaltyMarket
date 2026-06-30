"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  BatteryFull,
  Bell,
  ChartNoAxesCombined,
  ChevronRight,
  Clock3,
  Coins,
  Flag,
  FolderOpen,
  ListChecks,
  Medal,
  Monitor,
  PencilLine,
  Radio,
  Search,
  Trophy,
  WalletCards,
  Wifi,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { WalletButton } from "@/components/wallet-button";
import { shortKey } from "@/lib/format";

const navItems = [
  { href: "/", label: "Markets", icon: ChartNoAxesCombined },
  { href: "/portfolio", label: "My Bets", icon: ListChecks },
  { href: "/create", label: "Create", icon: PencilLine },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy }
];

const desktopIcons = [
  { href: "/", label: "Markets", icon: Monitor },
  { href: "/portfolio", label: "My Bets", icon: FolderOpen },
  { href: "/leaderboard", label: "Leaderboard", icon: Medal },
  { href: "/create", label: "Create Market", icon: PencilLine },
  { href: "#inbox", label: "Inbox", icon: Bell }
];

export function DesktopShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wallet = useWallet();
  const { connection } = useConnection();
  const [clock, setClock] = useState<Date | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    setClock(new Date());
    const interval = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!wallet.publicKey) {
      setBalance(null);
      return;
    }

    let cancelled = false;
    connection
      .getBalance(wallet.publicKey)
      .then((lamports) => {
        if (!cancelled) setBalance(lamports / 1_000_000_000);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      });

    return () => {
      cancelled = true;
    };
  }, [connection, wallet.publicKey]);

  const activeLabel = useMemo(() => {
    const active = navItems.find((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)));
    return active?.label ?? "Match";
  }, [pathname]);

  const walletLabel = wallet.publicKey ? shortKey(wallet.publicKey.toBase58()) : "No Wallet";
  const balanceLabel = balance === null ? "-- SOL" : `${balance.toFixed(balance >= 10 ? 1 : 3)} SOL`;
  const timeLabel = clock ? clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--";

  return (
    <div className="desktop-shell">
      <div className="desktop-wallpaper" aria-hidden="true">
        <div className="desktop-sideline desktop-sideline-left" />
        <div className="desktop-sideline desktop-sideline-right" />
        <div className="desktop-center-circle" />
      </div>

      <div className="desktop-icons" aria-label="Desktop shortcuts">
        {desktopIcons.map((item) => (
          <DesktopIcon key={item.label} {...item} />
        ))}
      </div>

      <div className="desktop-score-bug" aria-hidden="true">
        <div className="win95-titlebar">
          <span>LIVE_TICKER.EXE</span>
          <span className="win95-window-controls">
            <span>_</span>
            <span>□</span>
            <span>x</span>
          </span>
        </div>
        <div className="desktop-score-body">
          <span className="blink-dot" />
          Kickoff queue armed
        </div>
      </div>

      <PhoneFrame activeLabel={activeLabel} walletLabel={walletLabel} balanceLabel={balanceLabel}>
        {children}
      </PhoneFrame>

      <Taskbar
        activeLabel={activeLabel}
        balanceLabel={balanceLabel}
        startOpen={startOpen}
        timeLabel={timeLabel}
        walletLabel={walletLabel}
        onToggleStart={() => setStartOpen((open) => !open)}
      />
      {startOpen && <StartMenu onClose={() => setStartOpen(false)} />}
    </div>
  );
}

function DesktopIcon({
  href,
  label,
  icon: Icon
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const content = (
    <>
      <span className="desktop-icon-glyph">
        <Icon className="h-7 w-7" />
      </span>
      <span>{label}</span>
    </>
  );

  if (href.startsWith("#")) {
    return (
      <button className="desktop-icon" type="button">
        {content}
      </button>
    );
  }

  return (
    <Link className="desktop-icon" href={href}>
      {content}
    </Link>
  );
}

function PhoneFrame({
  activeLabel,
  balanceLabel,
  children,
  walletLabel
}: {
  activeLabel: string;
  balanceLabel: string;
  children: React.ReactNode;
  walletLabel: string;
}) {
  return (
    <main className="phone-stage">
      <section className="phone-frame" aria-label="PenaltyMarket match terminal">
        <div className="phone-speaker" aria-hidden="true" />
        <div className="phone-screen">
          <PhoneStatusBar activeLabel={activeLabel} balanceLabel={balanceLabel} walletLabel={walletLabel} />
          <div className="phone-app-titlebar">
            <div className="flex min-w-0 items-center gap-2">
              <Image src="/newlogo.png" alt="" width={24} height={24} className="h-6 w-6 rounded-sm bg-black object-contain" priority />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-black uppercase leading-none">PenaltyMarket 95</div>
                <div className="truncate text-[10px] font-bold text-[var(--win95-title-muted)]">Match Terminal - {activeLabel}</div>
              </div>
            </div>
            <div className="phone-window-buttons" aria-hidden="true">
              <span>_</span>
              <span>□</span>
              <span>
                <X className="h-3 w-3" />
              </span>
            </div>
          </div>
          <PhoneNav />
          <div className="phone-content">{children}</div>
        </div>
      </section>
    </main>
  );
}

function PhoneStatusBar({
  activeLabel,
  balanceLabel,
  walletLabel
}: {
  activeLabel: string;
  balanceLabel: string;
  walletLabel: string;
}) {
  return (
    <div className="phone-statusbar">
      <div className="flex min-w-0 items-center gap-2">
        <Radio className="h-3.5 w-3.5 text-[var(--win95-green)]" />
        <span className="truncate">DEVNET</span>
        <span className="statusbar-divider" />
        <span className="truncate">{activeLabel}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <WalletCards className="h-3.5 w-3.5" />
        <span className="hidden max-w-24 truncate sm:inline">{walletLabel}</span>
        <span className="truncate">{balanceLabel}</span>
        <Wifi className="h-3.5 w-3.5" />
        <BatteryFull className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

function PhoneNav() {
  const pathname = usePathname();

  return (
    <nav className="phone-nav" aria-label="Primary app navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} className={`phone-nav-item ${active ? "phone-nav-item-active" : ""}`} href={item.href}>
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Taskbar({
  activeLabel,
  balanceLabel,
  startOpen,
  timeLabel,
  walletLabel,
  onToggleStart
}: {
  activeLabel: string;
  balanceLabel: string;
  startOpen: boolean;
  timeLabel: string;
  walletLabel: string;
  onToggleStart: () => void;
}) {
  return (
    <footer className="taskbar">
      <button className={`start-button ${startOpen ? "is-pressed" : ""}`} onClick={onToggleStart} type="button">
        <Image src="/logo-removebg.png" alt="" width={20} height={20} className="h-5 w-5 object-contain" />
        Start
      </button>
      <div className="taskbar-tabs">
        <Link className="taskbar-tab is-active" href="/">
          <Flag className="h-4 w-4" />
          PM95 - {activeLabel}
        </Link>
        <span className="taskbar-tab taskbar-tab-secondary">
          <Coins className="h-4 w-4" />
          {balanceLabel}
        </span>
      </div>
      <div className="taskbar-wallet">
        <span className="hidden truncate md:inline">{walletLabel}</span>
        <WalletButton />
      </div>
      <div className="taskbar-clock">
        <Clock3 className="h-4 w-4" />
        {timeLabel}
      </div>
    </footer>
  );
}

function StartMenu({ onClose }: { onClose: () => void }) {
  return (
    <section className="start-menu" aria-label="Start menu">
      <div className="start-menu-rail">PenaltyMarket 95</div>
      <div className="start-menu-items">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} className="start-menu-item" href={item.href} onClick={onClose}>
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              <ChevronRight className="ml-auto h-4 w-4" />
            </Link>
          );
        })}
        <button className="start-menu-item" type="button" onClick={onClose}>
          <Search className="h-5 w-5" />
          <span>Find Match</span>
        </button>
      </div>
    </section>
  );
}
