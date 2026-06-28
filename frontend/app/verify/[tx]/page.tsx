import { Panel } from "@/components/ui";

export default async function VerifyPage({ params }: { params: Promise<{ tx: string }> }) {
  const { tx } = await params;

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Verify</h1>
        <p className="mt-1 break-all text-sm text-[var(--muted)]">{tx}</p>
      </div>
      <Panel>
        <h2 className="font-semibold">Merkle proof viewer</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Use `/api/proof/[fixtureId]` for TxLINE proof data. This page is ready to display a proof once the transaction
          metadata is mapped to a fixture and statistic.
        </p>
      </Panel>
    </div>
  );
}
