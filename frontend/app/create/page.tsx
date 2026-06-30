"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ClipboardCheck, Flag, PencilLine, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/lib/store";

const steps = ["Match", "Outcomes", "Deadline", "Preview"] as const;

export default function CreatePredictionPage() {
  const fixtures = useAppStore((state) => state.fixtures);
  const loadFixtures = useAppStore((state) => state.loadFixtures);
  const [step, setStep] = useState(0);
  const [fixtureId, setFixtureId] = useState("");
  const [marketName, setMarketName] = useState("Match Winner");
  const [homeOutcome, setHomeOutcome] = useState("");
  const [drawOutcome, setDrawOutcome] = useState("Draw");
  const [awayOutcome, setAwayOutcome] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    loadFixtures();
  }, [loadFixtures]);

  useEffect(() => {
    if (fixtureId || !fixtures.length) return;
    const first = fixtures[0];
    setFixtureId(String(first.fixtureId));
    setHomeOutcome(first.participant1);
    setAwayOutcome(first.participant2);
  }, [fixtureId, fixtures]);

  const selectedFixture = useMemo(
    () => fixtures.find((fixture) => String(fixture.fixtureId) === fixtureId),
    [fixtureId, fixtures]
  );

  useEffect(() => {
    if (!selectedFixture) return;
    setHomeOutcome((value) => value || selectedFixture.participant1);
    setAwayOutcome((value) => value || selectedFixture.participant2);
  }, [selectedFixture]);

  const canGoNext =
    step === 0 ? Boolean(fixtureId && marketName.trim()) :
    step === 1 ? Boolean(homeOutcome.trim() && drawOutcome.trim() && awayOutcome.trim()) :
    step === 2 ? Boolean(deadline) :
    true;

  function saveDraft() {
    setStatus(`Draft ready: ${marketName} for fixture ${fixtureId || "TBD"}`);
  }

  return (
    <div className="grid gap-3">
      <section className="win95-window">
        <div className="win95-titlebar">
          <span>CREATE_MARKET.WIZ</span>
          <span className="text-[10px] font-black">STEP {step + 1}/4</span>
        </div>
        <div className="win95-window-body grid gap-3">
          <div className="grid grid-cols-4 gap-1">
            {steps.map((item, index) => (
              <button
                className={`win95-button min-w-0 px-1 text-[10px] ${step === index ? "win95-button-primary" : ""}`}
                key={item}
                type="button"
                onClick={() => setStep(index)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="win95-panel-inset min-h-[270px] bg-[#efefdf] p-3">
            {step === 0 && (
              <div className="grid gap-3">
                <h1 className="flex items-center gap-2 text-lg font-black uppercase">
                  <PencilLine className="h-5 w-5" />
                  New Prediction
                </h1>
                <label className="win95-label">
                  <span>Fixture</span>
                  <select
                    className="win95-select"
                    value={fixtureId}
                    onChange={(event) => {
                      const nextFixtureId = event.target.value;
                      const fixture = fixtures.find((item) => String(item.fixtureId) === nextFixtureId);
                      setFixtureId(nextFixtureId);
                      setHomeOutcome(fixture?.participant1 ?? "");
                      setAwayOutcome(fixture?.participant2 ?? "");
                    }}
                  >
                    {!fixtures.length && <option value="">Loading fixtures</option>}
                    {fixtures.map((fixture) => (
                      <option key={fixture.fixtureId} value={fixture.fixtureId}>
                        #{fixture.fixtureId} - {fixture.participant1} vs {fixture.participant2}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="win95-label">
                  <span>Market Name</span>
                  <input className="win95-input" value={marketName} onChange={(event) => setMarketName(event.target.value)} />
                </label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
                  <TeamPreview label={selectedFixture?.participant1 ?? "Home"} />
                  <span className="font-black text-[#000080]">VS</span>
                  <TeamPreview label={selectedFixture?.participant2 ?? "Away"} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-3">
                <h1 className="flex items-center gap-2 text-lg font-black uppercase">
                  <Flag className="h-5 w-5" />
                  Outcomes
                </h1>
                <label className="win95-label">
                  <span>Outcome 1</span>
                  <input className="win95-input" value={homeOutcome} onChange={(event) => setHomeOutcome(event.target.value)} />
                </label>
                <label className="win95-label">
                  <span>Outcome 2</span>
                  <input className="win95-input" value={drawOutcome} onChange={(event) => setDrawOutcome(event.target.value)} />
                </label>
                <label className="win95-label">
                  <span>Outcome 3</span>
                  <input className="win95-input" value={awayOutcome} onChange={(event) => setAwayOutcome(event.target.value)} />
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-3">
                <h1 className="flex items-center gap-2 text-lg font-black uppercase">
                  <CalendarClock className="h-5 w-5" />
                  Whistle Timer
                </h1>
                <label className="win95-label">
                  <span>Close Time</span>
                  <input className="win95-input" type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
                </label>
                <div className="win95-panel-inset bg-white p-3 text-xs font-bold leading-5 text-[var(--muted)]">
                  Market windows are normally closed around official kickoff. Keep the whistle before live play.
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-3">
                <h1 className="flex items-center gap-2 text-lg font-black uppercase">
                  <ClipboardCheck className="h-5 w-5" />
                  Ticket Preview
                </h1>
                <div className="ticket-edge win95-panel-inset bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase text-[var(--muted)]">Fixture</div>
                      <div className="font-black">#{fixtureId || "TBD"}</div>
                    </div>
                    <ShieldCheck className="h-7 w-7 text-[#000080]" />
                  </div>
                  <div className="mt-3 text-lg font-black uppercase">{marketName || "Prediction Market"}</div>
                  <div className="mt-3 grid gap-1 text-sm font-bold">
                    {[homeOutcome, drawOutcome, awayOutcome].map((outcome, index) => (
                      <div className="grid grid-cols-[24px_1fr] bg-[#efefdf] p-2" key={`${outcome}-${index}`}>
                        <span className="font-black">{index + 1}</span>
                        <span>{outcome || `Outcome ${index + 1}`}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs font-bold text-[var(--muted)]">Close: {deadline || "Not set"}</div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-1">
            <button className="win95-button" type="button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>
              Back
            </button>
            {step < steps.length - 1 ? (
              <button className="win95-button win95-button-primary" type="button" disabled={!canGoNext} onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}>
                Next
              </button>
            ) : (
              <button className="win95-button win95-button-primary" type="button" onClick={saveDraft}>
                Save Draft
              </button>
            )}
          </div>

          {status && <div className="win95-panel-inset bg-white p-2 text-xs font-bold text-[var(--muted)]">{status}</div>}
        </div>
      </section>
    </div>
  );
}

function TeamPreview({ label }: { label: string }) {
  return (
    <div className="win95-panel-inset grid min-h-20 place-items-center bg-white p-2">
      <div className="text-xl font-black text-[#000080]">{teamCode(label)}</div>
      <div className="max-w-full truncate text-xs font-black uppercase">{label}</div>
    </div>
  );
}

function teamCode(name: string) {
  const words = name.replace(/[^a-zA-Z ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "TBD";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((word) => word[0]).join("").slice(0, 3).toUpperCase();
}
