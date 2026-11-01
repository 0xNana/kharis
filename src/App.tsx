import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Clock3,
  ExternalLink,
  Home,
  LockKeyhole,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import {
  useCurrentAccount,
  useCurrentNetwork,
  useDAppKit,
} from '@mysten/dapp-kit-react'
import { ConnectButton } from '@mysten/dapp-kit-react/ui'
import WalrusMemory from './WalrusMemory'
import VaultManager from './VaultManager'

type SuiNetwork = 'testnet' | 'mainnet'
type WorkspacePage = 'overview' | 'vault' | 'beneficiaries' | 'memory' | 'settings'

interface BalanceResponse {
  address: string
  network: SuiNetwork
  coinType: string
  totalBalanceMist: string
}

const TESTNET_PACKAGE_ID =
  '0x9c87cf7116c2302ee1ad8fe5903d4f4ce957656b0fbcf9718319e45c30855ed0'
const TESTNET_PACKAGE_URL = `https://suiscan.xyz/testnet/object/${TESTNET_PACKAGE_ID}`

const navigation: {
  id: WorkspacePage
  label: string
  path: string
  icon: typeof Home
}[] = [
  { id: 'overview', label: 'Overview', path: '/app', icon: Home },
  { id: 'vault', label: 'Your vault', path: '/app/vault', icon: LockKeyhole },
  { id: 'beneficiaries', label: 'Beneficiaries', path: '/app/beneficiaries', icon: Users },
  { id: 'memory', label: 'Memory', path: '/app/memory', icon: BookOpen },
  { id: 'settings', label: 'Settings', path: '/app/settings', icon: Settings },
]

const pageDetails: Record<WorkspacePage, { title: string; description?: string }> = {
  overview: {
    title: 'Overview',
  },
  vault: {
    title: 'Your vault',
    description: 'Set your check-in schedule and manage your vault.',
  },
  beneficiaries: {
    title: 'Beneficiaries',
    description: 'Choose who receives your assets and how they are shared.',
  },
  memory: {
    title: 'Memory',
    description: 'Save and find the notes you choose to remember.',
  },
  settings: {
    title: 'Settings',
    description: 'Choose a network for your account balance.',
  },
}

function getPage(pathname: string): WorkspacePage {
  const page = navigation.find((item) => item.path === pathname)
  return page?.id ?? 'overview'
}

function navigate(event: MouseEvent<HTMLAnchorElement>, path: string) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return
  }

  event.preventDefault()
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}

function formatSui(mist: string) {
  const amount = BigInt(mist)
  const whole = amount / 1_000_000_000n
  const fraction = (amount % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="/"
      aria-label="Kharis Sui legacy planning home"
      title={compact ? 'Kharis home' : undefined}
      className="mx-auto inline-flex w-fit items-center gap-md text-primary no-underline focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-focus-ring lg:mx-0"
    >
      <img src="/kharis-mark.svg" width="40" height="40" alt="" className="size-10 shrink-0" />
      <span className={compact ? 'sr-only lg:not-sr-only lg:leading-tight' : 'leading-tight'}>
        <span className="block text-md font-semibold">Kharis</span>
        {!compact && <span className="block text-xs text-tertiary">Sui legacy planning</span>}
      </span>
    </a>
  )
}

function LandingPage() {
  return (
    <div id="top" className="min-h-screen bg-primary text-primary">
      <header className="sticky top-0 z-20 border-b border-secondary bg-primary">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-7xl items-center justify-between gap-lg px-xl py-md lg:px-4xl"
        >
          <Brand />
          <div className="flex items-center gap-xs sm:gap-md">
            <a
              href="#how-it-works"
              className="hidden rounded-md px-md py-sm text-sm font-medium text-secondary hover:bg-secondary-hover focus-visible:ring-2 focus-visible:ring-focus-ring sm:inline-flex"
            >
              Product
            </a>
            <a
              href="#principles"
              className="hidden rounded-md px-md py-sm text-sm font-medium text-secondary hover:bg-secondary-hover focus-visible:ring-2 focus-visible:ring-focus-ring md:inline-flex"
            >
              Principles
            </a>
            <a
              href="#roadmap"
              className="hidden rounded-md px-md py-sm text-sm font-medium text-secondary hover:bg-secondary-hover focus-visible:ring-2 focus-visible:ring-focus-ring md:inline-flex"
            >
              Roadmap
            </a>
            <a
              href="#faq"
              className="hidden rounded-md px-md py-sm text-sm font-medium text-secondary hover:bg-secondary-hover focus-visible:ring-2 focus-visible:ring-focus-ring md:inline-flex"
            >
              FAQ
            </a>
            <a
              href="/app"
              className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Explore Kharis
              <ArrowRight size={16} className="shrink-0" aria-hidden="true" />
            </a>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-5xl px-xl py-7xl lg:grid-cols-2 lg:items-center lg:px-4xl lg:py-9xl">
          <div className="flex flex-col items-start gap-lg">
            <span className="inline-flex items-center gap-sm rounded-full border border-secondary bg-primary px-md py-xxs text-xs font-medium text-secondary shadow-xs">
              <span className="size-2 rounded-full bg-brand-solid" aria-hidden="true" />
              A more considered way to plan ahead
            </span>
            <h1 className="max-w-2xl text-heading-md font-semibold tracking-tight text-primary lg:text-heading-xl">
              Leave a plan.
              <br />
              Keep control.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-tertiary">
              Set a check-in schedule, choose who you trust, and keep control of your plan.
              Walrus Memory for separate notes is in progress.
            </p>
            <div className="mt-sm flex w-full flex-col gap-sm sm:w-auto sm:flex-row">
              <a
                href="/app"
                className="inline-flex items-center justify-center gap-sm rounded-lg border border-transparent bg-brand-solid px-xl py-md text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Explore Kharis
                <ArrowRight size={16} className="shrink-0" aria-hidden="true" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-lg border border-primary bg-primary px-xl py-md text-sm font-semibold text-secondary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                See how it works
              </a>
            </div>
            <div className="mt-md flex flex-wrap items-center gap-x-lg gap-y-sm text-xs text-tertiary">
              <span className="inline-flex items-center gap-xs">
                <span className="size-2 rounded-full bg-success-primary" aria-hidden="true" />
                Sui Testnet contract published
              </span>
              <span>Sui Testnet only · No real assets</span>
            </div>
          </div>

          <div className="rounded-2xl border border-secondary bg-primary p-xl shadow-xs sm:p-2xl">
                <div className="flex items-start justify-between gap-lg">
                  <div>
                    <p className="text-xs font-medium uppercase text-tertiary">
                      A plan, by design
                    </p>
                    <h2 className="mt-sm text-heading-xs font-semibold text-primary">
                      Built around your wishes
                    </h2>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-xs rounded-full border border-utility-brand-200 bg-utility-brand-50 px-md py-xxs text-xs font-medium text-utility-brand-700">
                    Sui
                  </span>
                </div>
                <p className="mt-md text-sm leading-relaxed text-tertiary">
                  Choose your check-in schedule and beneficiaries. This smart contract is
                  unaudited; use Testnet only.
                </p>
                <div className="mt-xl divide-y divide-secondary border-y border-secondary">
                  <div className="flex items-center gap-md py-lg">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-fg-secondary">
                      <Clock3 size={20} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary">A check-in rhythm</p>
                      <p className="mt-xxs text-xs text-tertiary">90-day window · 14-day grace</p>
                    </div>
                    <span className="ml-auto shrink-0 font-mono text-xs text-tertiary">01</span>
                  </div>
                  <div className="flex items-center gap-md py-lg">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-fg-secondary">
                      <Users size={20} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary">People you choose</p>
                      <p className="mt-xxs text-xs text-tertiary">Up to 10 beneficiary addresses</p>
                    </div>
                    <span className="ml-auto shrink-0 font-mono text-xs text-tertiary">02</span>
                  </div>
                  <div className="flex items-center gap-md py-lg">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-fg-secondary">
                      <ShieldCheck size={20} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary">Owner control</p>
                      <p className="mt-xxs text-xs text-tertiary">Actions remain open until release</p>
                    </div>
                    <span className="ml-auto shrink-0 font-mono text-xs text-tertiary">03</span>
                  </div>
                </div>
                <div className="mt-lg flex flex-col gap-md rounded-lg border border-utility-warning-200 bg-utility-warning-50 p-lg sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-utility-warning-700">
                      Sui Testnet only
                    </p>
                    <p className="mt-xxs text-xs text-secondary">
                      Testnet only. Do not use valuable assets.
                    </p>
                  </div>
                  <a
                    href={TESTNET_PACKAGE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit shrink-0 items-center gap-xs text-xs font-semibold text-brand-primary hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    View contract
                    <ExternalLink size={14} className="shrink-0" aria-hidden="true" />
                  </a>
                </div>
          </div>
        </section>

        <section className="border-y border-secondary bg-secondary">
          <div className="mx-auto grid max-w-7xl gap-xl px-xl py-2xl sm:grid-cols-3 lg:px-4xl">
            {[
              ['Built on Sui', 'Your wallet stays in control'],
              ['On Sui Testnet', 'See the contract for yourself'],
              ['Testnet only', 'Not available for real assets'],
            ].map(([title, detail], index) => (
              <div
                key={title}
                className={`flex items-start gap-md ${
                  index > 0 ? 'border-t border-secondary pt-xl sm:border-l sm:border-t-0 sm:pl-xl sm:pt-none' : ''
                }`}
              >
                <span className="mt-xxs size-2 shrink-0 rounded-full bg-brand-solid" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-primary">{title}</p>
                  <p className="mt-xxs text-xs text-tertiary">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24">
          <div className="mx-auto max-w-7xl px-xl py-7xl lg:px-4xl lg:py-8xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-brand-primary">How it works</p>
              <h2 className="mt-md text-heading-sm font-semibold text-primary">
                A plan that stays yours.
              </h2>
              <p className="mt-md text-md leading-relaxed text-tertiary">
                Choose when to check in, who to include, and how your plan is shared.
              </p>
            </div>
            <div className="mt-3xl grid gap-xl md:grid-cols-3">
              {[
                {
                  number: '01',
                  title: 'Choose your rhythm',
                  text: 'Choose a schedule that gives you time to check in.',
                  icon: Clock3,
                },
                {
                  number: '02',
                  title: 'Name your people',
                  text: 'Name up to ten people and choose each person’s share.',
                  icon: Users,
                },
                {
                  number: '03',
                  title: 'Stay in control',
                  text: 'Your plan stays in your control until the release conditions are met.',
                  icon: ShieldCheck,
                },
              ].map(({ number, title, text, icon: Icon }) => (
                <article key={number} className="border-t border-secondary pt-xl">
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-fg-secondary">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-xs text-tertiary">{number} / 03</span>
                  </div>
                  <h3 className="mt-xl text-md font-semibold text-primary">{title}</h3>
                  <p className="mt-sm text-sm leading-relaxed text-tertiary">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="principles" className="scroll-mt-24 border-y border-secondary bg-secondary">
          <div className="mx-auto grid max-w-7xl gap-3xl px-xl py-7xl lg:grid-cols-2 lg:items-center lg:px-4xl lg:py-8xl">
            <div>
              <p className="text-sm font-semibold text-brand-primary">Your choices</p>
              <h2 className="mt-md max-w-xl text-heading-sm font-semibold text-primary">
                Your keys. Your people. Your plan.
              </h2>
              <p className="mt-md max-w-xl text-md leading-relaxed text-tertiary">
                Your wallet approves each action. Your choices are recorded in a public
                smart contract you can inspect.
              </p>
            </div>
            <ul className="divide-y divide-secondary border-y border-secondary">
              {[
                ['Your keys stay yours', 'Approve every vault action in your Sui wallet.'],
                ['Clear rules', 'Inspect the smart contract on Sui Testnet.'],
                ['Memory stays separate', 'Optional Walrus notes never control your vault.'],
              ].map(([title, detail]) => (
                <li key={title} className="py-lg">
                  <h3 className="text-sm font-semibold text-primary">{title}</h3>
                  <p className="mt-xs text-sm leading-relaxed text-tertiary">{detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="roadmap" className="scroll-mt-24 border-y border-secondary bg-secondary">
          <div className="mx-auto max-w-7xl px-xl py-7xl lg:px-4xl lg:py-8xl">
            <div className="grid gap-xl lg:grid-cols-2 lg:items-end">
              <div>
                <p className="text-sm font-semibold text-brand-primary">What’s next</p>
                <h2 className="mt-md max-w-xl text-heading-sm font-semibold text-primary">
                  Built on Sui. Your notes on Walrus.
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-tertiary lg:justify-self-end">
                Vault setup is being tested on Sui Testnet. Walrus Memory is in progress;
                Mainnet comes after testing and an independent audit.
              </p>
            </div>
            <ol className="mt-3xl grid gap-xl sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  number: '01',
                  status: 'Available',
                  statusClass:
                    'border-utility-success-200 bg-utility-success-50 text-utility-success-700',
                  title: 'Vault rules',
                  detail:
                    'Explore the rules that govern your plan on Sui Testnet.',
                },
                {
                  number: '02',
                  status: 'In testing',
                  statusClass:
                    'border-utility-warning-200 bg-utility-warning-50 text-utility-warning-700',
                  title: 'Vault setup and check-ins',
                  detail:
                    'Testnet setup and check-ins are being tested. Never use real assets.',
                },
                {
                  number: '03',
                  status: 'In progress',
                  statusClass:
                    'border-utility-warning-200 bg-utility-warning-50 text-utility-warning-700',
                  title: 'Walrus Memory',
                  detail:
                    'Build notes on Walrus that stay separate from your vault.',
                },
                {
                  number: '04',
                  status: 'Before Mainnet',
                  statusClass:
                    'border-utility-gray-200 bg-utility-gray-50 text-utility-gray-700',
                  title: 'Mainnet launch',
                  detail:
                    'Independent security audit and complete Testnet testing come first.',
                },
              ].map(({ number, status, statusClass, title, detail }) => (
                <li key={number} className="border-t border-secondary pt-lg">
                  <div className="flex items-center justify-between gap-sm">
                    <span className="font-mono text-xs text-tertiary">{number}</span>
                    <span
                      className={`inline-flex rounded-full border px-md py-xxs text-xs font-medium ${statusClass}`}
                    >
                      {status}
                    </span>
                  </div>
                  <h3 className="mt-xl text-md font-semibold text-primary">{title}</h3>
                  <p className="mt-sm text-sm leading-relaxed text-tertiary">{detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24">
          <div className="mx-auto grid max-w-7xl gap-3xl px-xl py-7xl lg:grid-cols-2 lg:px-4xl lg:py-8xl">
            <div className="max-w-md">
              <p className="text-sm font-semibold text-brand-primary">Good to know</p>
              <h2 className="mt-md text-heading-sm font-semibold text-primary">
                Before you begin.
              </h2>
              <p className="mt-md text-sm leading-relaxed text-tertiary">
                A few important details about using Kharis.
              </p>
            </div>
            <div className="divide-y divide-secondary border-y border-secondary">
              {[
                {
                  question: 'Can I add assets to my vault?',
                  answer:
                    'Vaults are for Sui Testnet only and the contract has not been audited. Never use real or valuable assets.',
                },
                {
                  question: 'Has the contract been audited?',
                  answer:
                    'No. The smart contract is unaudited and is not ready for real assets.',
                },
                {
                  question: 'What is Walrus Memory used for?',
                  answer:
                    'Walrus Memory is being built for notes that stay separate from your vault. It never controls your assets or beneficiaries.',
                },
              ].map(({ question, answer }) => (
                <details key={question} className="group py-lg">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-lg text-sm font-semibold text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-focus-ring">
                    {question}
                    <ChevronDown
                      size={16}
                      className="shrink-0 text-fg-quaternary transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-md max-w-2xl pr-2xl text-sm leading-relaxed text-tertiary">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-secondary bg-secondary">
          <div className="mx-auto flex max-w-7xl flex-col gap-xl px-xl py-6xl lg:flex-row lg:items-center lg:justify-between lg:px-4xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-brand-primary">Get started</p>
              <h2 className="mt-md text-heading-sm font-semibold text-primary">
                Make a plan on your terms.
              </h2>
              <p className="mt-md text-sm leading-relaxed text-tertiary">
                View your Sui account, explore vault features, and learn about Walrus Memory.
              </p>
            </div>
            <a
              href="/app"
              className="inline-flex w-fit shrink-0 items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-xl py-md text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Open Kharis
              <ArrowRight size={16} className="shrink-0" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-secondary bg-primary">
        <div className="mx-auto max-w-7xl px-xl py-5xl lg:px-4xl lg:py-6xl">
          <div className="grid gap-3xl border-b border-secondary pb-3xl sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <Brand />
              <p className="mt-lg max-w-sm text-sm leading-relaxed text-tertiary">
                A clear, considered way to plan ahead.
              </p>
            </div>
            <nav aria-label="Footer navigation">
              <h2 className="text-sm font-semibold text-primary">Explore</h2>
              <ul className="mt-md space-y-sm text-sm text-secondary">
                <li><a href="#how-it-works" className="hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-focus-ring">How it works</a></li>
                <li><a href="#principles" className="hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-focus-ring">Our principles</a></li>
                <li><a href="#roadmap" className="hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-focus-ring">What comes next</a></li>
                <li><a href="#faq" className="hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-focus-ring">FAQ</a></li>
                <li><a href="/app" className="hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-focus-ring">Open Kharis</a></li>
              </ul>
            </nav>
            <div>
              <h2 className="text-sm font-semibold text-primary">Sui Testnet</h2>
              <a
                href={TESTNET_PACKAGE_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-md inline-flex items-center gap-xs text-sm text-secondary hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                View smart contract
                <ExternalLink size={14} className="shrink-0" aria-hidden="true" />
              </a>
              <p className="mt-md text-xs leading-relaxed text-tertiary">
                Unaudited · Testnet only · Never use real assets.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-sm pt-lg text-xs text-tertiary sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Kharis. Built for thoughtful planning.</span>
            <a
              href="#top"
              className="w-fit hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Back to top ↑
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function PageHeader({ page }: { page: WorkspacePage }) {
  const details = pageDetails[page]
  return (
    <header className="flex flex-col gap-lg border-b border-secondary bg-primary px-xl py-xl lg:flex-row lg:items-start lg:justify-between lg:px-3xl">
      <div className="min-w-0">
        <h1 className="text-heading-xs font-semibold text-primary">{details.title}</h1>
        {details.description && (
          <p className="mt-xs text-sm text-tertiary">{details.description}</p>
        )}
      </div>
    </header>
  )
}

function OverviewPage({
  accountAddress,
  balance,
  balanceError,
  loadingBalance,
}: {
  accountAddress: string | undefined
  balance: BalanceResponse | null
  balanceError: string | null
  loadingBalance: boolean
}) {
  return (
    <div className="flex flex-col gap-2xl">
      <section className="flex flex-col gap-lg rounded-xl border border-secondary bg-primary p-xl shadow-xs sm:flex-row sm:items-start sm:justify-between sm:p-2xl">
        <div className="flex items-start gap-md">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-fg-secondary">
            <LockKeyhole size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-md font-semibold text-primary">Testnet only</h2>
            <p className="mt-xs max-w-2xl text-sm leading-relaxed text-tertiary">
              The contract is unaudited. Never use real assets.
            </p>
          </div>
        </div>
        <a
          href={TESTNET_PACKAGE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-sm rounded-md text-sm font-medium text-brand-primary hover:underline focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          View contract
          <ExternalLink size={14} className="shrink-0" aria-hidden="true" />
        </a>
      </section>

      <section aria-label="Sui account" className="grid gap-lg md:grid-cols-2">
        <article className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-tertiary">Wallet address</p>
            <Wallet size={18} className="shrink-0 text-fg-quaternary" aria-hidden="true" />
          </div>
          {accountAddress ? (
            <>
              <p className="mt-md break-all font-mono text-sm font-semibold text-primary">
                {shortAddress(accountAddress)}
              </p>
              <p className="mt-xs break-all font-mono text-xs text-tertiary">{accountAddress}</p>
            </>
          ) : (
            <p className="mt-md text-sm text-secondary">Connect a wallet to see your address.</p>
          )}
        </article>
        <article className="rounded-xl border border-secondary bg-primary p-xl shadow-xs" aria-live="polite">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-tertiary">SUI balance</p>
          </div>
          {!accountAddress ? (
            <p className="mt-md text-sm text-secondary">Connect a wallet to see your balance.</p>
          ) : loadingBalance ? (
            <p className="mt-md text-sm text-secondary">Loading balance…</p>
          ) : balanceError ? (
            <p className="mt-md text-sm text-error-primary" role="alert">{balanceError}</p>
          ) : balance ? (
            <p className="mt-md text-heading-xs font-semibold text-primary">
              {formatSui(balance.totalBalanceMist)} SUI
            </p>
          ) : (
            <p className="mt-md text-sm text-secondary">Balance isn’t available right now.</p>
          )}
        </article>
      </section>
    </div>
  )
}

function SettingsPage({
  network,
  setNetwork,
}: {
  network: SuiNetwork
  setNetwork: (network: SuiNetwork) => void
}) {
  return (
    <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs sm:p-2xl">
      <h2 className="text-md font-semibold text-primary">Account network</h2>
      <p className="mt-xs text-sm text-tertiary">
        Choose a network for your account. Vault actions are available on Testnet only.
      </p>
      <div className="mt-xl inline-flex rounded-lg border border-secondary bg-secondary p-xxs" aria-label="Sui network">
        {(['testnet', 'mainnet'] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={network === item}
            onClick={() => setNetwork(item)}
            className={`rounded-md px-md py-xs text-xs font-semibold capitalize focus-visible:ring-2 focus-visible:ring-focus-ring ${
              network === item
                ? 'bg-primary text-primary shadow-xs'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      {network === 'mainnet' && (
        <p className="mt-lg max-w-xl text-xs leading-relaxed text-utility-warning-700">
          On Mainnet, you can check balances only. Vault actions aren’t available.
        </p>
      )}
    </section>
  )
}

function Workspace() {
  const account = useCurrentAccount()
  const network = useCurrentNetwork() as SuiNetwork
  const dAppKit = useDAppKit()
  const [pathname, setPathname] = useState(window.location.pathname)
  const [balance, setBalance] = useState<BalanceResponse | null>(null)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const page = getPage(pathname)

  useEffect(() => {
    const updatePath = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', updatePath)
    return () => window.removeEventListener('popstate', updatePath)
  }, [])

  useEffect(() => {
    if (!account) {
      setBalance(null)
      setBalanceError(null)
      setLoadingBalance(false)
      return
    }

    const controller = new AbortController()
    setLoadingBalance(true)
    setBalanceError(null)
    setBalance(null)

    fetch(`/api/sui/${network}/balance/${encodeURIComponent(account.address)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error('Your balance is unavailable right now.')
        return body as BalanceResponse
      })
      .then(setBalance)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error('Sui balance request failed:', error)
          setBalanceError('Your balance is unavailable right now. Try again later.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingBalance(false)
      })

    return () => controller.abort()
  }, [account?.address, network])

  const setNetwork = (nextNetwork: SuiNetwork) => {
    dAppKit.switchNetwork(nextNetwork)
  }

  return (
    <div className="flex min-h-screen flex-row bg-secondary text-primary">
      <aside className="sticky top-0 z-30 flex h-screen w-16 shrink-0 flex-col border-r border-secondary bg-primary lg:w-64">
        <div className="flex items-center justify-center px-sm py-md lg:justify-start lg:px-xl lg:py-xl">
          <Brand compact />
        </div>
        <nav
          aria-label="Workspace navigation"
          className="flex flex-1 flex-col items-center gap-xs overflow-y-auto px-sm py-lg lg:items-stretch lg:px-md"
        >
          {navigation.map(({ id, label, path, icon: Icon }) => {
            const active = page === id
            return (
              <a
                key={id}
                href={path}
                title={label}
                aria-current={active ? 'page' : undefined}
                onClick={(event) => navigate(event, path)}
                className={`inline-flex min-h-10 w-full items-center justify-center gap-md rounded-lg px-sm py-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring lg:justify-start lg:px-md ${
                  active
                    ? 'bg-utility-brand-50 text-brand-primary'
                    : 'text-secondary hover:bg-secondary-hover hover:text-primary'
                }`}
              >
                <Icon size={18} className="shrink-0" aria-hidden="true" />
                <span className="sr-only lg:not-sr-only">{label}</span>
              </a>
            )
          })}
        </nav>
        <div className="hidden border-t border-secondary p-lg lg:block">
          <a
            href="/"
            className="inline-flex items-center gap-sm rounded-md px-md py-sm text-xs font-medium text-tertiary hover:bg-secondary-hover hover:text-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <ArrowLeft size={16} className="shrink-0" aria-hidden="true" />
            Back to Kharis home
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-md border-b border-secondary bg-primary px-xl py-md lg:justify-end lg:px-3xl">
          <span className="inline-flex items-center gap-xs rounded-full border border-utility-brand-200 bg-utility-brand-50 px-md py-xxs text-xs font-medium capitalize text-utility-brand-700">
            <span className="size-2 rounded-full bg-current" aria-hidden="true" />
            Sui {network}
          </span>
          <ConnectButton instance={dAppKit} />
        </div>

        <PageHeader page={page} />

        <main className="flex-1 p-xl lg:p-3xl">
          <div className="mx-auto max-w-5xl">
            {page === 'overview' && (
              <OverviewPage
                accountAddress={account?.address}
                balance={balance}
                balanceError={balanceError}
                loadingBalance={loadingBalance}
              />
            )}
            {(page === 'vault' || page === 'beneficiaries') && (
              <VaultManager mode={page} network={network} />
            )}
            {page === 'memory' && <WalrusMemory />}
            {page === 'settings' && <SettingsPage network={network} setNetwork={setNetwork} />}
          </div>
        </main>

        <footer className="flex flex-col gap-sm border-t border-secondary bg-primary px-xl py-lg text-xs text-tertiary sm:flex-row sm:items-center sm:justify-between lg:px-3xl">
          <span>Kharis · Sui {network}</span>
          <span>Vault actions are for Testnet only.</span>
        </footer>
      </div>
    </div>
  )
}

export default function App() {
  const [pathname, setPathname] = useState(window.location.pathname)

  useEffect(() => {
    const updatePath = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', updatePath)
    return () => window.removeEventListener('popstate', updatePath)
  }, [])

  if (pathname === '/' || pathname === '/index.html') {
    return <LandingPage />
  }

  return <Workspace />
}
