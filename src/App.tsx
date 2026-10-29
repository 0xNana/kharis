import React, { useState } from 'react';
import {
  ShieldAlert,
  HeartPulse,
  Users,
  Clock,
  Coins,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  RefreshCw,
  ExternalLink,
  Lock,
  ChevronDown,
  ChevronUp,
  Globe,
  Sparkles,
  Layers,
  FileCheck,
  Scale,
  Send,
  Zap,
  Sliders
} from 'lucide-react';

export function App() {
  const [view, setView] = useState<'landing' | 'app'>('landing');

  // App demo / interactive vault state
  const [inactivityDays, setInactivityDays] = useState(90);
  const [gracePeriodDays, setGracePeriodDays] = useState(14);
  const [lastCheckIn, setLastCheckIn] = useState<Date>(new Date(Date.now() - 1000 * 60 * 60 * 24 * 12));
  const [vaultBalance, setVaultBalance] = useState(25000);
  const [appTab, setAppTab] = useState<'overview' | 'beneficiaries' | 'settings'>('overview');
  const [showPingModal, setShowPingModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('5000');

  // FAQ accordion open states
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Beneficiaries
  const [beneficiaries, setBeneficiaries] = useState([
    { id: '1', label: 'Primary Beneficiary (Spouse)', address: '0x71C...4e8B', share: 60 },
    { id: '2', label: 'College Trust (Child)', address: '0x32A...991c', share: 20 },
    { id: '3', label: 'Backup Guardian (Sibling)', address: '0x99F...65Bc', share: 20 },
  ]);

  const daysSinceHeartbeat = Math.floor((Date.now() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilGrace = Math.max(0, inactivityDays - daysSinceHeartbeat);
  const daysUntilExecution = Math.max(0, inactivityDays + gracePeriodDays - daysSinceHeartbeat);

  const switchStatus =
    daysSinceHeartbeat >= inactivityDays + gracePeriodDays
      ? 'TRIGGERED'
      : daysSinceHeartbeat >= inactivityDays
      ? 'GRACE_PERIOD'
      : 'ACTIVE';

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePing = () => {
    setLastCheckIn(new Date());
    setShowPingModal(false);
  };

  return (
    <div className="min-h-screen bg-secondary text-primary font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-secondary bg-primary sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-xl py-lg flex items-center justify-between">
          <div className="flex items-center gap-md cursor-pointer" onClick={() => setView('landing')}>
            <div className="w-10 h-10 rounded-lg bg-brand-solid flex items-center justify-center text-primary-on-brand shadow-xs">
              <ShieldAlert className="w-5 h-5 text-fg-white" />
            </div>
            <div>
              <div className="flex items-center gap-xs">
                <span className="text-heading-xs font-bold text-primary">Kharis</span>
                <span className="inline-flex items-center gap-xs rounded-full border border-utility-brand-200 bg-utility-brand-50 px-md py-xxs text-xs font-medium text-utility-brand-700">
                  Base USDC Vault
                </span>
              </div>
              <p className="text-xs text-secondary">A plan for your USDC, for the day you need one.</p>
            </div>
          </div>

          <div className="flex items-center gap-md">
            {view === 'landing' ? (
              <>
                <nav className="hidden md:flex items-center gap-lg text-sm text-secondary">
                  <button onClick={() => scrollToSection('problem')} className="hover:text-primary transition font-medium">
                    The Problem
                  </button>
                  <button onClick={() => scrollToSection('how-it-works')} className="hover:text-primary transition font-medium">
                    How It Works
                  </button>
                  <button onClick={() => scrollToSection('features')} className="hover:text-primary transition font-medium">
                    Benefits
                  </button>
                  <button onClick={() => scrollToSection('security')} className="hover:text-primary transition font-medium">
                    Security
                  </button>
                  <button onClick={() => scrollToSection('faq')} className="hover:text-primary transition font-medium">
                    FAQ
                  </button>
                </nav>
                <button
                  onClick={() => setView('app')}
                  className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <span>Launch App &rarr;</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setView('landing')}
                className="inline-flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <span>&larr; Return to Landing Page</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* VIEW: LANDING PAGE */}
      {view === 'landing' && (
        <main className="flex-1">
          {/* Hero Section */}
          <section className="border-b border-secondary bg-primary py-2xl lg:py-4xl">
            <div className="max-w-5xl mx-auto px-xl text-center space-y-xl">
              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-xs rounded-full border border-utility-brand-200 bg-utility-brand-50 px-md py-xs text-xs font-semibold text-utility-brand-700 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-brand-solid animate-pulse" />
                <span>Runs on Base · Currently live on Base Mainnet &amp; Sepolia</span>
              </div>

              {/* Headline */}
              <h1 className="text-heading-xl lg:text-heading-2xl font-bold text-primary tracking-tight">
                Your USDC, in the right hands.<br className="hidden sm:inline" /> Even when you can't be there.
              </h1>

              {/* Subhead */}
              <p className="max-w-3xl mx-auto text-md lg:text-lg text-secondary leading-relaxed">
                Kharis is a simple vault for your USDC. Choose who should receive it, then check in every so often.
                If you ever stop, it passes to them in the shares you set. No company sits in the middle, and no one holds a key to it.
              </p>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-md pt-md">
                <button
                  onClick={() => setView('app')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-sm rounded-lg border border-transparent bg-brand-solid px-2xl py-md text-md font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <span>Launch app &rarr;</span>
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-sm rounded-lg bg-primary px-2xl py-md text-md font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <span>See how it works &darr;</span>
                </button>
              </div>

              {/* Under-CTA microcopy */}
              <p className="text-xs text-tertiary">
                Early software that hasn't been audited. Please start with small amounts.
              </p>
            </div>
          </section>

          {/* Social Proof / Vault Preview Card */}
          <section className="max-w-5xl mx-auto px-xl -mt-lg mb-2xl">
            <div className="rounded-xl border border-secondary bg-primary p-xl shadow-md space-y-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md border-b border-secondary pb-md">
                <div className="flex items-center gap-md">
                  <div className="p-sm rounded-lg bg-utility-brand-50 border border-utility-brand-200">
                    <HeartPulse className="w-5 h-5 text-fg-brand-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-primary">Live Switch Countdown Preview</span>
                    <p className="text-xs text-secondary">Non-custodial proof-of-life status</p>
                  </div>
                </div>
                <div className="flex items-center gap-sm">
                  <span className="inline-flex items-center gap-xs rounded-full border border-utility-success-200 bg-utility-success-50 px-md py-xxs text-xs font-medium text-utility-success-700">
                    Active · 76 days remaining
                  </span>
                  <button
                    onClick={() => setView('app')}
                    className="text-xs font-semibold text-brand-primary hover:underline"
                  >
                    Open Live Vault &rarr;
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md text-xs">
                <div className="p-md rounded-lg bg-secondary border border-secondary">
                  <span className="text-secondary">Protected Assets</span>
                  <p className="text-sm font-bold text-primary mt-xxs">$25,000.00 USDC</p>
                </div>
                <div className="p-md rounded-lg bg-secondary border border-secondary">
                  <span className="text-secondary">Designated Beneficiaries</span>
                  <p className="text-sm font-bold text-primary mt-xxs">3 Heirs (100% Split)</p>
                </div>
                <div className="p-md rounded-lg bg-secondary border border-secondary">
                  <span className="text-secondary">Check-In Cadence</span>
                  <p className="text-sm font-bold text-primary mt-xxs">Every 90 Days (+14d Grace)</p>
                </div>
              </div>
            </div>
          </section>

          {/* The Problem Section */}
          <section id="problem" className="py-2xl lg:py-3xl max-w-5xl mx-auto px-xl space-y-xl">
            <div className="max-w-3xl space-y-md">
              <span className="text-xs font-semibold uppercase tracking-wider text-quaternary">The Dilemma</span>
              <h2 className="text-heading-lg font-bold text-primary tracking-tight">
                Your money is safe with you. That's the problem.
              </h2>
              <p className="text-md text-secondary leading-relaxed">
                Holding your own USDC means nobody can freeze it, lose it, or spend it for you. But it also means nobody else can reach it.
                If you're gone, or simply can't get to your wallet, those funds can sit untouched indefinitely, even when the people you'd want to have them are right there.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
              <div className="rounded-xl border border-secondary bg-primary p-xl space-y-sm shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-utility-error-50 border border-utility-error-200 flex items-center justify-center text-utility-error-700">
                  <AlertTriangle className="w-4 h-4 text-fg-error-primary" />
                </div>
                <h3 className="text-heading-xs font-semibold text-primary">Sharing Recovery Phrases</h3>
                <p className="text-sm text-secondary leading-relaxed">
                  Gives someone full access today, not just someday. It introduces immediate counterparty risk while you're still alive.
                </p>
              </div>

              <div className="rounded-xl border border-secondary bg-primary p-xl space-y-sm shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-utility-warning-50 border border-utility-warning-200 flex items-center justify-center text-utility-warning-700">
                  <Users className="w-4 h-4 text-fg-warning-primary" />
                </div>
                <h3 className="text-heading-xs font-semibold text-primary">Trusting Custodians</h3>
                <p className="text-sm text-secondary leading-relaxed">
                  Handing funds to a centralized company means trusting an intermediary to exist, remain solvent, and act when it matters.
                </p>
              </div>

              <div className="rounded-xl border border-secondary bg-primary p-xl space-y-sm shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-utility-gray-50 border border-utility-gray-200 flex items-center justify-center text-secondary">
                  <Lock className="w-4 h-4 text-fg-quaternary" />
                </div>
                <h3 className="text-heading-xs font-semibold text-primary">Instructions on Paper</h3>
                <p className="text-sm text-secondary leading-relaxed">
                  Writing seed words or instructions down somewhere relies on the right person finding them, surviving disasters, and knowing what to do.
                </p>
              </div>
            </div>

            <div className="p-xl rounded-xl border border-secondary bg-primary text-secondary text-sm leading-relaxed">
              <strong className="text-primary font-semibold">Kharis takes another approach:</strong> You keep full control while you're here.
              If you stop checking in, the rules you set decide where the money goes.
            </div>
          </section>

          {/* How It Works Section */}
          <section id="how-it-works" className="py-2xl lg:py-3xl border-t border-secondary bg-secondary">
            <div className="max-w-5xl mx-auto px-xl space-y-xl">
              <div className="text-center space-y-sm max-w-2xl mx-auto">
                <span className="text-xs font-semibold uppercase tracking-wider text-quaternary">Step-By-Step</span>
                <h2 className="text-heading-lg font-bold text-primary tracking-tight">
                  Four steps. Then you just live your life.
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                <div className="rounded-xl border border-secondary bg-primary p-xl space-y-sm shadow-xs">
                  <div className="flex items-center gap-sm">
                    <span className="w-7 h-7 rounded-full bg-brand-solid text-primary-on-brand text-xs font-bold flex items-center justify-center">1</span>
                    <h3 className="text-heading-xs font-semibold text-primary">Create your vault</h3>
                  </div>
                  <p className="text-sm text-secondary leading-relaxed">
                    Give it a name and add the USDC you want to set aside on Base. You can add more later, or take some back whenever you need.
                  </p>
                </div>

                <div className="rounded-xl border border-secondary bg-primary p-xl space-y-sm shadow-xs">
                  <div className="flex items-center gap-sm">
                    <span className="w-7 h-7 rounded-full bg-brand-solid text-primary-on-brand text-xs font-bold flex items-center justify-center">2</span>
                    <h3 className="text-heading-xs font-semibold text-primary">Choose your people</h3>
                  </div>
                  <p className="text-sm text-secondary leading-relaxed">
                    Add up to 10 beneficiaries by wallet address and decide how much each one receives. Shares must add up to exactly 100%. One tap splits them evenly.
                  </p>
                </div>

                <div className="rounded-xl border border-secondary bg-primary p-xl space-y-sm shadow-xs">
                  <div className="flex items-center gap-sm">
                    <span className="w-7 h-7 rounded-full bg-brand-solid text-primary-on-brand text-xs font-bold flex items-center justify-center">3</span>
                    <h3 className="text-heading-xs font-semibold text-primary">Set your check-in window</h3>
                  </div>
                  <p className="text-sm text-secondary leading-relaxed">
                    Choose how long Kharis should wait after your last sign of life, anywhere from 7 days to 10 years. Then, every so often, press "I'm Alive." The clock starts over each time.
                  </p>
                </div>

                <div className="rounded-xl border border-secondary bg-primary p-xl space-y-sm shadow-xs">
                  <div className="flex items-center gap-sm">
                    <span className="w-7 h-7 rounded-full bg-brand-solid text-primary-on-brand text-xs font-bold flex items-center justify-center">4</span>
                    <h3 className="text-heading-xs font-semibold text-primary">If you stop checking in, it passes on</h3>
                  </div>
                  <p className="text-sm text-secondary leading-relaxed">
                    After your window runs out, anyone can trigger the release. Then anyone can press "Pay Everyone" to send every beneficiary their share in one transaction. Your beneficiaries don't have to sign anything to receive it.
                  </p>
                </div>
              </div>

              <div className="p-md rounded-lg bg-utility-brand-50 border border-utility-brand-200 text-utility-brand-700 text-xs">
                <strong>Good to know:</strong> When you withdraw funds or update your beneficiaries, that also counts as checking in. Adding funds does not. Use "I'm Alive" for that.
              </div>
            </div>
          </section>

          {/* Features & Benefits */}
          <section id="features" className="py-2xl lg:py-3xl border-t border-secondary bg-primary">
            <div className="max-w-5xl mx-auto px-xl space-y-xl">
              <div className="max-w-3xl space-y-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-quaternary">Architecture</span>
                <h2 className="text-heading-lg font-bold text-primary tracking-tight">
                  Built to be simple, and built so it can't be quietly changed.
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                <div className="p-xl rounded-xl border border-secondary bg-secondary space-y-sm">
                  <h3 className="text-heading-xs font-semibold text-primary">You stay in control while you're here</h3>
                  <p className="text-sm text-secondary leading-relaxed">
                    Until the window runs out, the vault is yours. You can add USDC, withdraw it, update your beneficiaries, or close the vault and get your remaining balance back.
                  </p>
                </div>

                <div className="p-xl rounded-xl border border-secondary bg-secondary space-y-sm">
                  <h3 className="text-heading-xs font-semibold text-primary">Shares paid exactly as you set them</h3>
                  <p className="text-sm text-secondary leading-relaxed">
                    You set each person's share in fine increments (0.01%). When the vault pays out, the last beneficiary also gets any leftover rounding amount, so the whole balance goes out and nothing is left behind.
                  </p>
                </div>

                <div className="p-xl rounded-xl border border-secondary bg-secondary space-y-sm">
                  <h3 className="text-heading-xs font-semibold text-primary">Beneficiaries don't have to do anything</h3>
                  <p className="text-sm text-secondary leading-relaxed">
                    Anyone can pay everyone in a single transaction, so your beneficiaries never need to sign a transaction or keep funds on hand for fees. If they'd rather, each person can also claim their own share.
                  </p>
                </div>

                <div className="p-xl rounded-xl border border-secondary bg-secondary space-y-sm">
                  <h3 className="text-heading-xs font-semibold text-primary">One problem doesn't hold up everyone else</h3>
                  <p className="text-sm text-secondary leading-relaxed">
                    If one beneficiary's address can't receive USDC (for example, because it has been blocked by USDC's issuer), Kharis skips that person and pays the others. The skipped share stays set aside in the vault for that person.
                  </p>
                </div>

                <div className="p-xl rounded-xl border border-secondary bg-secondary space-y-sm">
                  <h3 className="text-heading-xs font-semibold text-primary">No admin keys. No upgrades. No pause button.</h3>
                  <p className="text-sm text-secondary leading-relaxed">
                    Nobody, including the people who built Kharis, can change the rules, freeze your vault, or move your funds. The contract has no owner and can't be upgraded.
                  </p>
                </div>

                <div className="p-xl rounded-xl border border-secondary bg-secondary space-y-sm">
                  <h3 className="text-heading-xs font-semibold text-primary">USDC only, start to finish</h3>
                  <p className="text-sm text-secondary leading-relaxed">
                    You deposit USDC and your beneficiaries receive USDC. On Base, transaction gas is less than a penny, so operating the vault requires negligible overhead.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Who It's For */}
          <section className="py-2xl lg:py-3xl border-t border-secondary bg-secondary">
            <div className="max-w-5xl mx-auto px-xl space-y-xl">
              <div className="max-w-3xl space-y-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-quaternary">Use Cases</span>
                <h2 className="text-heading-lg font-bold text-primary tracking-tight">
                  For anyone who's ever wondered, "What if?"
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg">
                <div className="p-xl rounded-xl border border-secondary bg-primary space-y-sm shadow-xs">
                  <h4 className="text-sm font-semibold text-primary">Parents and partners</h4>
                  <p className="text-xs text-secondary leading-relaxed">
                    You hold savings in USDC and want them to go to your family without asking anyone's permission and without anyone needing your recovery phrase.
                  </p>
                </div>

                <div className="p-xl rounded-xl border border-secondary bg-primary space-y-sm shadow-xs">
                  <h4 className="text-sm font-semibold text-primary">Off-the-grid adventurers</h4>
                  <p className="text-xs text-secondary leading-relaxed">
                    Travel, sail, climb, or work far from home. Set a window that fits how you live: a few weeks off the grid won't trigger anything, and a prolonged silence will.
                  </p>
                </div>

                <div className="p-xl rounded-xl border border-secondary bg-primary space-y-sm shadow-xs">
                  <h4 className="text-sm font-semibold text-primary">Builders &amp; freelancers</h4>
                  <p className="text-xs text-secondary leading-relaxed">
                    Your income already lives on-chain. Kharis gives part of it a plan, split among the people, co-founders, or causes you choose.
                  </p>
                </div>

                <div className="p-xl rounded-xl border border-secondary bg-primary space-y-sm shadow-xs">
                  <h4 className="text-sm font-semibold text-primary">Lost wallet insurance</h4>
                  <p className="text-xs text-secondary leading-relaxed">
                    If you lose your wallet and can't check in, your vault still passes to the people you named, preventing permanent on-chain asset loss.
                  </p>
                </div>

                <div className="p-xl rounded-xl border border-secondary bg-primary space-y-sm shadow-xs sm:col-span-2">
                  <h4 className="text-sm font-semibold text-primary">The curious and careful</h4>
                  <p className="text-xs text-secondary leading-relaxed">
                    Want to see how it works before trusting it with anything that matters? Kharis is live on testnet, so you can test every check-in and execution step without real money.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Trust & Security */}
          <section id="security" className="py-2xl lg:py-3xl border-t border-secondary bg-primary">
            <div className="max-w-5xl mx-auto px-xl space-y-xl">
              <div className="max-w-3xl space-y-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-quaternary">Verification &amp; Caveats</span>
                <h2 className="text-heading-lg font-bold text-primary tracking-tight">
                  What you can count on, and what you should know.
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                {/* Guarantees */}
                <div className="space-y-md">
                  <h3 className="text-heading-xs font-semibold text-primary flex items-center gap-xs">
                    <CheckCircle2 className="w-5 h-5 text-fg-success-primary" />
                    <span>What the code guarantees</span>
                  </h3>
                  <ul className="space-y-sm text-xs text-secondary leading-relaxed">
                    <li className="p-md rounded-lg bg-secondary border border-secondary">
                      <strong className="text-primary font-medium">No one else holds the keys:</strong> The vault contract has no owner, no administrator, no pause switch, and no upgrade path. Once deployed, its rules are immutable.
                    </li>
                    <li className="p-md rounded-lg bg-secondary border border-secondary">
                      <strong className="text-primary font-medium">Funds go only where you said:</strong> A release can only pay the beneficiaries you named, in the shares you set. Anyone may trigger a release once your window has passed, but nobody can redirect the money.
                    </li>
                    <li className="p-md rounded-lg bg-secondary border border-secondary">
                      <strong className="text-primary font-medium">Nothing happens early:</strong> Funds can't be released while your window is still open, and after a release nobody can claim the same share twice.
                    </li>
                    <li className="p-md rounded-lg bg-secondary border border-secondary">
                      <strong className="text-primary font-medium">Built with standard safeguards:</strong> The contract uses OpenZeppelin's widely used protection against re-entrancy attacks and has an automated test suite.
                    </li>
                  </ul>
                </div>

                {/* What you should know */}
                <div className="space-y-md">
                  <h3 className="text-heading-xs font-semibold text-primary flex items-center gap-xs">
                    <AlertTriangle className="w-5 h-5 text-fg-warning-primary" />
                    <span>What you should know before you use it</span>
                  </h3>
                  <ul className="space-y-sm text-xs text-secondary leading-relaxed">
                    <li className="p-md rounded-lg bg-secondary border border-secondary">
                      <strong className="text-primary font-medium">It hasn't been audited:</strong> Kharis has not had an independent security audit. Smart contracts can have bugs; please use only amounts you could afford to lose.
                    </li>
                    <li className="p-md rounded-lg bg-secondary border border-secondary">
                      <strong className="text-primary font-medium">There is no undo:</strong> Because nobody holds admin keys, nobody can reverse a mistake. A wrong beneficiary address can't be corrected after release.
                    </li>
                    <li className="p-md rounded-lg bg-secondary border border-secondary">
                      <strong className="text-primary font-medium">It doesn't remind you:</strong> Kharis won't email you before your deadline. Set your own calendar reminder and choose a window with a comfortable margin.
                    </li>
                    <li className="p-md rounded-lg bg-secondary border border-secondary">
                      <strong className="text-primary font-medium">It isn't a legal will:</strong> Kharis moves USDC according to code. It doesn't replace legal, tax, or estate advice, and only covers the USDC inside the vault.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section id="faq" className="py-2xl lg:py-3xl border-t border-secondary bg-secondary">
            <div className="max-w-4xl mx-auto px-xl space-y-xl">
              <div className="text-center space-y-sm max-w-xl mx-auto">
                <span className="text-xs font-semibold uppercase tracking-wider text-quaternary">Common Questions</span>
                <h2 className="text-heading-lg font-bold text-primary tracking-tight">
                  Frequently Asked Questions
                </h2>
              </div>

              <div className="space-y-sm">
                {[
                  {
                    q: 'What exactly happens if I stop checking in?',
                    a: 'Nothing happens right away. Once your inactivity window has fully passed, the vault becomes eligible for release. Someone (a beneficiary, a friend, or anyone else) presses "Trigger Release," which locks in the balance for payout. Then anyone can press "Pay Everyone" to send every beneficiary their share, or each beneficiary can claim their own.',
                  },
                  {
                    q: "What if I just forget, or I'm in the hospital, and my deadline passes?",
                    a: "The vault doesn't pay out by itself the moment your deadline passes. Someone has to trigger the release. Until that happens, checking in brings the vault back to normal. Once anyone triggers the release, though, it's final. Don't rely on this grace period. Choose a window with plenty of room to spare, and set yourself a reminder.",
                  },
                  {
                    q: 'Do my beneficiaries need crypto, or gas, to receive their share?',
                    a: "No. On Base, anyone can send every beneficiary their share in one transaction. Your beneficiaries don't have to sign anything or keep funds on hand. They only need a wallet address that can receive USDC.",
                  },
                  {
                    q: 'Can I change my mind?',
                    a: 'Yes, as long as your window hasn\'t run out. You can add or withdraw USDC, update your beneficiaries and their shares, or close the vault and get your full remaining balance back. Closing is permanent. If you change your mind later, you\'ll need to create a new vault.',
                  },
                  {
                    q: 'Can Kharis, or anyone else, take my money?',
                    a: 'No. The contract has no admin keys, no owner, and no upgrade mechanism, so nobody can move funds outside of the rules you configured when depositing.',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-secondary bg-primary overflow-hidden shadow-xs">
                    <button
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="w-full p-xl flex items-center justify-between text-left text-sm font-semibold text-primary hover:bg-secondary-hover transition"
                    >
                      <span>{item.q}</span>
                      {openFaq === idx ? (
                        <ChevronUp className="w-4 h-4 text-fg-quaternary shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-fg-quaternary shrink-0" />
                      )}
                    </button>
                    {openFaq === idx && (
                      <div className="px-xl pb-xl text-xs text-secondary leading-relaxed border-t border-secondary pt-md bg-secondary">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pre-Footer CTA */}
          <section className="py-2xl lg:py-3xl border-t border-secondary bg-primary text-center">
            <div className="max-w-3xl mx-auto px-xl space-y-lg">
              <h2 className="text-heading-lg font-bold text-primary tracking-tight">
                Ready to protect your digital legacy on Base?
              </h2>
              <p className="text-sm text-secondary leading-relaxed">
                Start with a testnet vault or configure small USDC allocations. No middleman, no admin keys.
              </p>
              <div>
                <button
                  onClick={() => setView('app')}
                  className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-2xl py-md text-md font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <span>Launch Kharis App &rarr;</span>
                </button>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* VIEW: LIVE WEB APP */}
      {view === 'app' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-xl py-2xl space-y-2xl">
          {/* Health Banner */}
          <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-xl">
              <div className="flex items-start gap-lg">
                <div className={`p-md rounded-xl ${
                  switchStatus === 'ACTIVE'
                    ? 'bg-utility-success-50 border border-utility-success-200'
                    : switchStatus === 'TRIGGERED'
                    ? 'bg-utility-error-50 border border-utility-error-200'
                    : 'bg-utility-warning-50 border border-utility-warning-200'
                }`}>
                  {switchStatus === 'ACTIVE' ? (
                    <CheckCircle2 className="w-8 h-8 text-fg-success-primary" />
                  ) : switchStatus === 'TRIGGERED' ? (
                    <ShieldAlert className="w-8 h-8 text-fg-error-primary" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-fg-warning-primary" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-sm">
                    <h2 className="text-heading-sm font-semibold text-primary">Switch Status: {switchStatus}</h2>
                    <span className={`inline-flex items-center gap-xs rounded-full px-md py-xxs text-xs font-medium border ${
                      switchStatus === 'ACTIVE'
                        ? 'border-utility-success-200 bg-utility-success-50 text-utility-success-700'
                        : switchStatus === 'TRIGGERED'
                        ? 'border-utility-error-200 bg-utility-error-50 text-utility-error-700'
                        : 'border-utility-warning-200 bg-utility-warning-50 text-utility-warning-700'
                    }`}>
                      {switchStatus === 'TRIGGERED'
                        ? 'Vault Released to Beneficiaries'
                        : `${daysUntilGrace} days until grace period`}
                    </span>
                  </div>
                  <p className="text-sm text-secondary mt-xxs">
                    Last proof-of-life ping verified {daysSinceHeartbeat} days ago ({lastCheckIn.toLocaleDateString()}).
                    Press "I'm Alive" below to reset the {inactivityDays}-day countdown.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-md w-full lg:w-auto justify-end">
                <button
                  onClick={() => setShowPingModal(true)}
                  className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <HeartPulse className="w-4 h-4 text-fg-white shrink-0" />
                  <span>I'm Alive (Ping)</span>
                </button>
                <button
                  onClick={() => setShowDepositModal(true)}
                  className="inline-flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <Coins className="w-4 h-4 text-fg-secondary shrink-0" />
                  <span>Deposit USDC</span>
                </button>
              </div>
            </div>

            {/* Countdown Bar */}
            <div className="mt-xl pt-lg border-t border-secondary">
              <div className="flex justify-between items-center text-xs text-secondary mb-xs">
                <span>Time since last check-in: <strong className="text-primary font-medium">{daysSinceHeartbeat} days</strong></span>
                <span>Window: <strong className="text-primary font-medium">{inactivityDays} days</strong> (+{gracePeriodDays}d grace)</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-3 overflow-hidden border border-secondary">
                <div
                  className={`h-full transition-all duration-500 ${
                    daysSinceHeartbeat < inactivityDays * 0.75
                      ? 'bg-success-primary'
                      : daysSinceHeartbeat < inactivityDays
                      ? 'bg-warning-primary'
                      : 'bg-error-primary'
                  }`}
                  style={{ width: `${Math.min(100, Math.round((daysSinceHeartbeat / (inactivityDays + gracePeriodDays)) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs text-tertiary mt-xs">
                <span>Day 0 (Latest Check-in)</span>
                <span>Day {inactivityDays} (Window Closes)</span>
                <span>Day {inactivityDays + gracePeriodDays} (Execution Window)</span>
              </div>
            </div>
          </section>

          {/* Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-lg">
            <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-quaternary">Protected Balance</span>
              <p className="mt-md text-heading-sm font-bold text-primary">${vaultBalance.toLocaleString()} USDC</p>
              <p className="text-xs text-secondary mt-xxs">Base Mainnet Native Token</p>
            </section>

            <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-quaternary">Beneficiaries</span>
              <p className="mt-md text-heading-sm font-bold text-primary">{beneficiaries.length} Designated Heirs</p>
              <p className="text-xs text-secondary mt-xxs">100% allocation scheduled</p>
            </section>

            <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-quaternary">Inactivity Window</span>
              <p className="mt-md text-heading-sm font-bold text-primary">{inactivityDays} Days</p>
              <p className="text-xs text-secondary mt-xxs">+{gracePeriodDays} days grace period</p>
            </section>
          </div>

          {/* App Tabs */}
          <div className="flex border-b border-secondary gap-xl">
            <button
              onClick={() => setAppTab('overview')}
              className={`pb-md text-sm font-semibold transition border-b-2 ${
                appTab === 'overview' ? 'border-brand text-brand-primary' : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              Vault Dashboard
            </button>
            <button
              onClick={() => setAppTab('beneficiaries')}
              className={`pb-md text-sm font-semibold transition border-b-2 ${
                appTab === 'beneficiaries' ? 'border-brand text-brand-primary' : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              Beneficiaries ({beneficiaries.length})
            </button>
            <button
              onClick={() => setAppTab('settings')}
              className={`pb-md text-sm font-semibold transition border-b-2 ${
                appTab === 'settings' ? 'border-brand text-brand-primary' : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              Window Parameters
            </button>
          </div>

          {appTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
              <div className="lg:col-span-2 space-y-xl">
                <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-heading-xs font-semibold text-primary">Base Vault Contract</h3>
                      <p className="text-xs text-secondary mt-xxs">No admin keys, no pause button, autonomous USDC distribution</p>
                    </div>
                    <span className="inline-flex items-center gap-xs rounded-full border border-utility-brand-200 bg-utility-brand-50 px-md py-xxs text-xs font-medium text-utility-brand-700">
                      Base Mainnet
                    </span>
                  </div>

                  <div className="p-md rounded-lg bg-secondary border border-secondary font-mono text-xs text-primary flex items-center justify-between">
                    <span>0x742d35Cc6634C0532925a3b844Bc454e4438f44e</span>
                    <a
                      href="https://basescan.org"
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-primary hover:underline flex items-center gap-xxs"
                    >
                      <span>Basescan</span>
                      <ExternalLink className="w-3 h-3 text-fg-brand-primary" />
                    </a>
                  </div>

                  <div className="space-y-sm">
                    <span className="text-xs font-semibold text-quaternary uppercase tracking-wider">Beneficiary Shares</span>
                    {beneficiaries.map((b) => (
                      <div key={b.id} className="p-md rounded-lg bg-secondary border border-secondary flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-primary">{b.label}</span>
                          <span className="text-secondary ml-xs font-mono">({b.address})</span>
                        </div>
                        <div className="flex items-center gap-md">
                          <span className="font-semibold text-primary">${((vaultBalance * b.share) / 100).toLocaleString()} USDC</span>
                          <span className="inline-flex items-center rounded-full border border-utility-gray-200 bg-utility-gray-50 px-sm py-xxs font-medium text-secondary">
                            {b.share}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-xl">
                <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-md">
                  <h3 className="text-heading-xs font-semibold text-primary">Emergency Revocation</h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Until your inactivity window runs out, you retain 100% custody. You can withdraw your USDC at any time or close the vault permanently.
                  </p>
                  <button
                    onClick={() => {
                      setVaultBalance(0);
                    }}
                    className="w-full inline-flex items-center justify-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-error-primary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <span>Emergency Full Withdrawal</span>
                  </button>
                </section>
              </div>
            </div>
          )}

          {appTab === 'beneficiaries' && (
            <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-heading-xs font-semibold text-primary">Name Beneficiaries (Up to 10)</h3>
                  <p className="text-xs text-secondary mt-xxs">Add wallet addresses and choose exact percentage portions.</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-secondary bg-primary">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary text-quaternary font-semibold">
                    <tr className="border-b border-secondary">
                      <th className="px-3xl py-md">Label</th>
                      <th className="px-3xl py-md">Base Address</th>
                      <th className="px-3xl py-md">Share (%)</th>
                      <th className="px-3xl py-md">Value (USDC)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary">
                    {beneficiaries.map((b) => (
                      <tr key={b.id} className="hover:bg-secondary-hover">
                        <td className="px-3xl py-xl font-medium text-primary">{b.label}</td>
                        <td className="px-3xl py-xl font-mono text-tertiary">{b.address}</td>
                        <td className="px-3xl py-xl font-semibold text-primary">{b.share}%</td>
                        <td className="px-3xl py-xl text-primary font-medium">
                          ${((vaultBalance * b.share) / 100).toLocaleString()} USDC
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {appTab === 'settings' && (
            <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-lg">
              <div>
                <h3 className="text-heading-xs font-semibold text-primary">Inactivity &amp; Check-In Window</h3>
                <p className="text-xs text-secondary mt-xxs">Choose how long Kharis should wait after your last sign of life (7 days to 10 years).</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                <div className="flex flex-col gap-sm">
                  <label className="text-sm font-medium text-secondary">Inactivity Window (Days)</label>
                  <input
                    type="number"
                    value={inactivityDays}
                    onChange={(e) => setInactivityDays(Number(e.target.value))}
                    min="7"
                    max="3650"
                    className="rounded-md bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
                  />
                  <p className="text-xs text-tertiary">Any withdrawal or "I'm Alive" ping resets this countdown.</p>
                </div>

                <div className="flex flex-col gap-sm">
                  <label className="text-sm font-medium text-secondary">Grace Period Buffer (Days)</label>
                  <input
                    type="number"
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                    min="1"
                    max="90"
                    className="rounded-md bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
                  />
                  <p className="text-xs text-tertiary">Warning period before payout execution is unlocked.</p>
                </div>
              </div>
            </section>
          )}
        </main>
      )}

      {/* Ping Modal */}
      {showPingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-md">
          <div className="rounded-xl border border-secondary bg-primary shadow-xl max-w-md w-full p-xl space-y-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-xs">
                <HeartPulse className="w-5 h-5 text-fg-brand-primary" />
                <h3 className="text-heading-xs font-bold text-primary">"I'm Alive" Check In</h3>
              </div>
              <button onClick={() => setShowPingModal(false)} className="text-tertiary hover:text-primary text-sm font-semibold">
                ✕
              </button>
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              Pressing "I'm Alive" proves you are active and resets the inactivity countdown for another {inactivityDays} days.
            </p>

            <div className="flex items-center justify-end gap-md pt-sm">
              <button
                onClick={() => setShowPingModal(false)}
                className="inline-flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Cancel
              </button>
              <button
                onClick={handlePing}
                className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <HeartPulse className="w-4 h-4 text-fg-white shrink-0" />
                <span>Confirm Check In</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-md">
          <div className="rounded-xl border border-secondary bg-primary shadow-xl max-w-md w-full p-xl space-y-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-xs">
                <Coins className="w-5 h-5 text-fg-brand-primary" />
                <h3 className="text-heading-xs font-bold text-primary">Deposit USDC</h3>
              </div>
              <button onClick={() => setShowDepositModal(false)} className="text-tertiary hover:text-primary text-sm font-semibold">
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-sm">
              <label className="text-sm font-medium text-secondary">Amount (USDC)</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="rounded-md bg-primary px-lg py-sm text-sm text-primary border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
              />
            </div>

            <div className="flex items-center justify-end gap-md pt-sm">
              <button
                onClick={() => setShowDepositModal(false)}
                className="inline-flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setVaultBalance(vaultBalance + Number(depositAmount || 0));
                  setShowDepositModal(false);
                }}
                className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <span>Deposit USDC</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-secondary bg-primary py-xl text-xs text-secondary">
        <div className="max-w-7xl mx-auto px-xl flex flex-col sm:flex-row items-center justify-between gap-md">
          <div className="flex items-center gap-xs">
            <ShieldAlert className="w-4 h-4 text-fg-brand-primary" />
            <span className="font-semibold text-primary">Kharis</span>
            <span className="text-tertiary">· Non-custodial USDC dead-man's switch on Base</span>
          </div>
          <div className="text-tertiary">
            Early software that hasn't been audited. Please start with small amounts.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
