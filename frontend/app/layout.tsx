import type { Metadata } from "next";
import { BetDialog } from "@/components/bet-dialog";
import { Providers } from "@/components/providers";
import { DesktopShell } from "@/components/win95-shell";
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
          <DesktopShell>
            <BetDialog />
            {children}
          </DesktopShell>
        </Providers>
      </body>
    </html>
  );
}
