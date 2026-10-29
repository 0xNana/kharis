import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  HeartPulse,
  Users,
  Clock,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  ExternalLink,
  Lock,
  Sliders,
  HelpCircle,
  Bell,
  Trash2,
  Layers,
  ArrowRight
} from 'lucide-react';

interface Beneficiary {
  id: string;
  address: string;
  label: string;
  sharePercent: number;
  allocatedAmountUsdc: number;
  status: 'Pending' | 'Eligible' | 'Claimed';
}

interface ActivityEvent {
  id: string;
  type: 'ping' | 'deposit' | 'beneficiary_update' | 'threshold_change' | 'warning';
  title: string;
  detail: string;
  timestamp: string;
  txHash?: string;
}

interface VaultData {
  vaultAddress: string;
  usdcAddress: string;
  network: string;
  usdcBalance: number;
  nativeEthBalance: number;
  hasLiveChainData: boolean;
  chainError: string | null;
  lastHeartbeat: string;
  daysSinceHeartbeat: number;
  inactivityDays: number;
  gracePeriodDays: number;
  daysUntilGrace: number;
  daysUntilExecution: number;
  switchStatus: 'ACTIVE' | 'WARNING' | 'GRACE_PERIOD' | 'TRIGGERED';
  beneficiaries: Beneficiary[];
  activities: ActivityEvent[];
  webhookAlertId: string | null;
}

export function App() {
  const [data, setData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'vault' | 'beneficiaries' | 'settings' | 'history'>('vault');

  // Modals
  const [showPingModal, setShowPingModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showAddBeneficiaryModal, setShowAddBeneficiaryModal] = useState(false);

  // Form states
  const [customInactivity, setCustomInactivity] = useState<number>(90);
  const [customGrace, setCustomGrace] = useState<number>(14);
  const [depositAmount, setDepositAmount] = useState<string>('5000');
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newShare, setNewShare] = useState<number>(25);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Webhook monitoring
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [webhookSubscribed, setWebhookSubscribed] = useState(false);

  const fetchVaultData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/kharis/vault');
      const json: VaultData = await res.json();
      setData(json);
      setCustomInactivity(json.inactivityDays);
      setCustomGrace(json.gracePeriodDays);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown network failure';
      setErrorMsg('Failed to load Kharis vault on Base: ' + message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultData();
  }, []);

  const handlePing = async () => {
    try {
      setActionLoading('ping');
      const res = await fetch('/api/kharis/ping', { method: 'POST' });
      if (res.ok) {
        await fetchVaultData();
        setShowPingModal(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg('Heartbeat failed: ' + message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading('settings');
      const res = await fetch('/api/kharis/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inactivityDays: customInactivity,
          gracePeriodDays: customGrace,
        }),
      });
      if (res.ok) {
        await fetchVaultData();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg('Setting update failed: ' + message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSimulate = async (action: 'trigger' | 'warning' | 'reset') => {
    try {
      setActionLoading('simulate');
      await fetch('/api/kharis/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await fetchVaultData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newAddress || newShare <= 0) return;
    try {
      setActionLoading('addBen');
      const res = await fetch('/api/kharis/beneficiaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newLabel,
          address: newAddress,
          sharePercent: newShare,
        }),
      });
      if (res.ok) {
        setNewLabel('');
        setNewAddress('');
        setNewShare(20);
        setShowAddBeneficiaryModal(false);
        await fetchVaultData();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveBeneficiary = async (id: string) => {
    try {
      await fetch(`/api/kharis/beneficiaries/${id}`, { method: 'DELETE' });
      await fetchVaultData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg('Remove failed: ' + message);
    }
  };

  const handleSubscribeNotifications = async () => {
    try {
      setActionLoading('notif');
      const res = await fetch('/api/kharis/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: webhookUrlInput || undefined }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setWebhookSubscribed(true);
        await fetchVaultData();
      } else {
        setErrorMsg(resData.error || 'Failed to register alert');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(message);
    } finally {
      setActionLoading(null);
    }
  };

  const totalAllocation = data?.beneficiaries.reduce((sum, b) => sum + b.sharePercent, 0) || 0;

  return (
    <div className="min-h-screen bg-secondary text-primary font-sans flex flex-col">
      {/* Top Header */}
      <header className="border-b border-secondary bg-primary sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-xl py-lg flex items-center justify-between">
          <div className="flex items-center gap-md">
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
              <p className="text-xs text-secondary">Non-Custodial Dead-Man's Switch & Digital Inheritance</p>
            </div>
          </div>

          <div className="flex items-center gap-md">
            <div className="hidden md:flex items-center gap-xs px-md py-xs rounded-lg bg-secondary border border-secondary text-xs text-secondary">
              <span className="w-2 h-2 rounded-full bg-success-primary animate-pulse" />
              <span>Base Mainnet (8453)</span>
            </div>

            <button
              onClick={() => setShowPingModal(true)}
              className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
            >
              <HeartPulse className="w-4 h-4 text-fg-white shrink-0" />
              <span>Check In (Ping)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-xl py-2xl space-y-2xl">
        {errorMsg && (
          <div className="rounded-xl border border-error-subtle bg-utility-error-50 p-xl flex items-center justify-between text-utility-error-700 text-sm">
            <div className="flex items-center gap-md">
              <AlertTriangle className="w-5 h-5 text-fg-error-primary shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-xs font-semibold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Top Status Alert / Health Banner */}
        <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-xl">
            <div className="flex items-start gap-lg">
              <div className={`p-md rounded-xl ${
                data?.switchStatus === 'ACTIVE'
                  ? 'bg-utility-success-50 border border-utility-success-200'
                  : data?.switchStatus === 'TRIGGERED'
                  ? 'bg-utility-error-50 border border-utility-error-200'
                  : 'bg-utility-warning-50 border border-utility-warning-200'
              }`}>
                {data?.switchStatus === 'ACTIVE' ? (
                  <CheckCircle2 className="w-8 h-8 text-fg-success-primary" />
                ) : data?.switchStatus === 'TRIGGERED' ? (
                  <ShieldAlert className="w-8 h-8 text-fg-error-primary" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-fg-warning-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-sm">
                  <h2 className="text-heading-sm font-semibold text-primary">Switch Status: {data?.switchStatus || 'INITIALIZING'}</h2>
                  <span className={`inline-flex items-center gap-xs rounded-full px-md py-xxs text-xs font-medium border ${
                    data?.switchStatus === 'ACTIVE'
                      ? 'border-utility-success-200 bg-utility-success-50 text-utility-success-700'
                      : data?.switchStatus === 'TRIGGERED'
                      ? 'border-utility-error-200 bg-utility-error-50 text-utility-error-700'
                      : 'border-utility-warning-200 bg-utility-warning-50 text-utility-warning-700'
                  }`}>
                    {data?.switchStatus === 'TRIGGERED'
                      ? 'Vault Released to Beneficiaries'
                      : data?.switchStatus === 'GRACE_PERIOD'
                      ? 'Grace Period In Progress'
                      : `${data?.daysUntilGrace ?? 0} days until grace period`}
                  </span>
                </div>
                <p className="text-sm text-secondary mt-xxs">
                  Last proof-of-life ping verified {data?.daysSinceHeartbeat ?? 0} days ago ({data?.lastHeartbeat ? new Date(data.lastHeartbeat).toLocaleDateString() : 'N/A'}).
                  {data?.switchStatus === 'ACTIVE' && ` Regular check-in required within ${data?.daysUntilGrace} days.`}
                  {data?.switchStatus === 'GRACE_PERIOD' && ` Action required: Heartbeat ping must be sent within ${data?.daysUntilExecution} days to cancel automated inheritance release.`}
                  {data?.switchStatus === 'TRIGGERED' && ` Threshold met without response. Timelock released: Designated heirs may claim their USDC portions.`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-md w-full lg:w-auto justify-end">
              <button
                onClick={() => setShowPingModal(true)}
                disabled={actionLoading === 'ping'}
                className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
              >
                <HeartPulse className="w-4 h-4 text-fg-white shrink-0" />
                <span>{actionLoading === 'ping' ? 'Signing Ping...' : 'Send Heartbeat'}</span>
              </button>
              <button
                onClick={() => setShowDepositModal(true)}
                className="inline-flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <Coins className="w-4 h-4 text-fg-secondary shrink-0" />
                <span>Deposit USDC</span>
              </button>
              <button
                onClick={fetchVaultData}
                disabled={loading}
                className="inline-flex items-center justify-center p-sm rounded-lg bg-primary border border-primary text-secondary hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                title="Refresh Base Vault Data"
              >
                <RefreshCw className={`w-4 h-4 text-fg-secondary ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Progress Timeline Bar */}
          <div className="mt-xl pt-lg border-t border-secondary">
            <div className="flex justify-between items-center text-xs text-secondary mb-xs">
              <span>Time since last check-in: <strong className="text-primary font-medium">{data?.daysSinceHeartbeat ?? 0} days</strong></span>
              <span>Cadence: <strong className="text-primary font-medium">{data?.inactivityDays ?? 90}d inactivity</strong> + {data?.gracePeriodDays ?? 14}d grace buffer</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3 overflow-hidden border border-secondary">
              <div
                className={`h-full transition-all duration-500 ${
                  (data?.daysSinceHeartbeat ?? 0) < (data?.inactivityDays ?? 90) * 0.75
                    ? 'bg-success-primary'
                    : (data?.daysSinceHeartbeat ?? 0) < (data?.inactivityDays ?? 90)
                    ? 'bg-warning-primary'
                    : 'bg-error-primary'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      ((data?.daysSinceHeartbeat ?? 0) /
                        ((data?.inactivityDays ?? 90) + (data?.gracePeriodDays ?? 14))) *
                        100
                    )
                  )}%`,
                }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-tertiary mt-xs">
              <span>Day 0 (Latest Ping)</span>
              <span>Day {data?.inactivityDays ?? 90} (Grace Trigger)</span>
              <span>Day {(data?.inactivityDays ?? 90) + (data?.gracePeriodDays ?? 14)} (Inheritance Executable)</span>
            </div>
          </div>
        </section>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">
          <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
            <div className="flex items-center justify-between text-secondary">
              <span className="text-xs font-semibold uppercase tracking-wider text-quaternary">Protected Balance</span>
              <Coins className="w-4 h-4 text-fg-quaternary" />
            </div>
            <div className="mt-md">
              <div className="text-heading-sm font-bold text-primary">
                ${(data?.usdcBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-secondary mt-xxs">USDC on Base Mainnet</p>
            </div>
          </section>

          <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
            <div className="flex items-center justify-between text-secondary">
              <span className="text-xs font-semibold uppercase tracking-wider text-quaternary">Designated Heirs</span>
              <Users className="w-4 h-4 text-fg-quaternary" />
            </div>
            <div className="mt-md">
              <div className="text-heading-sm font-bold text-primary">
                {data?.beneficiaries.length ?? 0} Beneficiaries
              </div>
              <p className="text-xs text-secondary mt-xxs">{totalAllocation}% of total assets assigned</p>
            </div>
          </section>

          <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
            <div className="flex items-center justify-between text-secondary">
              <span className="text-xs font-semibold uppercase tracking-wider text-quaternary">Check-in Interval</span>
              <Clock className="w-4 h-4 text-fg-quaternary" />
            </div>
            <div className="mt-md">
              <div className="text-heading-sm font-bold text-primary">
                {data?.inactivityDays ?? 90} Days
              </div>
              <p className="text-xs text-secondary mt-xxs">+{data?.gracePeriodDays ?? 14}d safety grace buffer</p>
            </div>
          </section>

          <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
            <div className="flex items-center justify-between text-secondary">
              <span className="text-xs font-semibold uppercase tracking-wider text-quaternary">Gas Reserve</span>
              <Lock className="w-4 h-4 text-fg-quaternary" />
            </div>
            <div className="mt-md">
              <div className="text-heading-sm font-bold text-primary">
                {data?.nativeEthBalance ?? 0.045} ETH
              </div>
              <p className="text-xs text-secondary mt-xxs">Base L2 automated dispersal gas</p>
            </div>
          </section>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-secondary gap-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('vault')}
            className={`pb-md text-sm font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'vault'
                ? 'border-brand text-brand-primary'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            Vault & Architecture
          </button>
          <button
            onClick={() => setActiveTab('beneficiaries')}
            className={`pb-md text-sm font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'beneficiaries'
                ? 'border-brand text-brand-primary'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            Beneficiaries & Heirs ({data?.beneficiaries.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-md text-sm font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-brand text-brand-primary'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            Switch Parameters & Simulation
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-md text-sm font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-brand text-brand-primary'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            Audit Trail & On-Chain Logs
          </button>
        </div>

        {/* TAB 1: Vault Overview */}
        {activeTab === 'vault' && (
          <div className="space-y-xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
              {/* Vault Specifications */}
              <div className="lg:col-span-2 space-y-xl">
                <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-heading-xs font-semibold text-primary">Kharis Inheritance Vault on Base</h3>
                      <p className="text-xs text-secondary mt-xxs">Autonomous smart contract holding USDC with condition-gated release</p>
                    </div>
                    <a
                      href={`https://basescan.org/address/${data?.vaultAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-xs text-xs font-medium text-brand-primary hover:underline"
                    >
                      <span>Basescan</span>
                      <ExternalLink className="w-3.5 h-3.5 text-fg-brand-primary" />
                    </a>
                  </div>

                  <div className="p-md rounded-lg bg-secondary border border-secondary flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md">
                    <div className="flex items-center gap-sm">
                      <Lock className="w-4 h-4 text-fg-secondary shrink-0" />
                      <div>
                        <div className="text-xs text-secondary font-medium">Vault Contract</div>
                        <div className="font-mono text-xs text-primary font-medium">{data?.vaultAddress}</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-xs rounded-full border border-utility-brand-200 bg-utility-brand-50 px-md py-xxs text-xs font-medium text-utility-brand-700">
                      Base Mainnet
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-md pt-md border-t border-secondary">
                    <div>
                      <span className="text-xs text-secondary">USDC Token Address (Native Base)</span>
                      <p className="font-mono text-xs text-primary mt-xxs font-medium">{data?.usdcAddress}</p>
                    </div>
                    <div>
                      <span className="text-xs text-secondary">Fail-Safe Emergency Revocation</span>
                      <p className="text-xs text-primary mt-xxs font-medium">Owner can withdraw or cancel switch at any time</p>
                    </div>
                  </div>

                  {/* Heir Allocation Summary */}
                  <div className="pt-md border-t border-secondary">
                    <div className="flex items-center justify-between mb-sm">
                      <span className="text-xs font-semibold text-quaternary uppercase tracking-wider">Configured Beneficiary Splits</span>
                      <button
                        onClick={() => setActiveTab('beneficiaries')}
                        className="text-xs font-semibold text-brand-primary hover:underline"
                      >
                        Modify Allocations &rarr;
                      </button>
                    </div>

                    <div className="space-y-sm">
                      {data?.beneficiaries.map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-md rounded-lg bg-secondary border border-secondary text-xs">
                          <div>
                            <span className="font-semibold text-primary">{b.label}</span>
                            <span className="text-secondary ml-xs font-mono">({b.address.substring(0, 6)}...{b.address.substring(38)})</span>
                          </div>
                          <div className="flex items-center gap-md">
                            <span className="font-semibold text-primary">${((data.usdcBalance * b.sharePercent) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC</span>
                            <span className="inline-flex items-center rounded-full border border-utility-gray-200 bg-utility-gray-50 px-sm py-xxs font-medium text-secondary">
                              {b.sharePercent}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Tatum Notifications / Webhook Section */}
                <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-md">
                  <div className="flex items-center gap-xs">
                    <Bell className="w-5 h-5 text-fg-brand-primary" />
                    <div>
                      <h3 className="text-heading-xs font-semibold text-primary">Automated Inactivity & Webhook Alerts</h3>
                      <p className="text-xs text-secondary mt-xxs">Powered by Tatum Notifications for real-time vault event dispatch</p>
                    </div>
                  </div>

                  <p className="text-xs text-secondary leading-relaxed">
                    Subscribe an off-chain webhook or monitoring bot to receive push notifications when incoming USDC deposits arrive or when heartbeat timers near the grace threshold on Base.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-md">
                    <div className="flex-1 w-full flex flex-col gap-sm">
                      <input
                        type="url"
                        value={webhookUrlInput}
                        onChange={(e) => setWebhookUrlInput(e.target.value)}
                        placeholder="https://your-domain.com/api/tatum-webhook"
                        className="rounded-md bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring w-full"
                      />
                    </div>
                    <button
                      onClick={handleSubscribeNotifications}
                      disabled={actionLoading === 'notif' || webhookSubscribed}
                      className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50 shrink-0 w-full sm:w-auto justify-center"
                    >
                      <Bell className="w-4 h-4 text-fg-white shrink-0" />
                      <span>{webhookSubscribed ? 'Alert Active' : actionLoading === 'notif' ? 'Registering...' : 'Enable Alert Webhook'}</span>
                    </button>
                  </div>

                  {webhookSubscribed && (
                    <div className="p-sm rounded-md bg-utility-success-50 border border-utility-success-200 text-utility-success-700 text-xs flex items-center gap-xs">
                      <CheckCircle2 className="w-4 h-4 text-fg-success-primary" />
                      <span>Tatum v4 webhook subscription verified for Base vault address.</span>
                    </div>
                  )}
                </section>
              </div>

              {/* Sidebar Quick Actions & Instructions */}
              <div className="space-y-xl">
                <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-md">
                  <h3 className="text-heading-xs font-semibold text-primary">Quick Actions</h3>

                  <button
                    onClick={() => setShowPingModal(true)}
                    className="w-full inline-flex items-center justify-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <HeartPulse className="w-4 h-4 text-fg-white shrink-0" />
                    <span>Send Heartbeat (Ping)</span>
                  </button>

                  <button
                    onClick={() => setShowDepositModal(true)}
                    className="w-full inline-flex items-center justify-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <Coins className="w-4 h-4 text-fg-secondary shrink-0" />
                    <span>Deposit / Fund Vault</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('settings')}
                    className="w-full inline-flex items-center justify-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <Sliders className="w-4 h-4 text-fg-secondary shrink-0" />
                    <span>Adjust Inactivity Timers</span>
                  </button>
                </section>

                <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-sm">
                  <div className="flex items-center gap-xs text-xs font-semibold text-quaternary uppercase tracking-wider">
                    <HelpCircle className="w-4 h-4 text-fg-quaternary" />
                    <span>How Kharis Works</span>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    1. <strong>Active Period:</strong> Owner sends a proof-of-life ping anytime before {data?.inactivityDays ?? 90} days elapse. Any wallet activity resets the timer.
                  </p>
                  <p className="text-xs text-secondary leading-relaxed">
                    2. <strong>Grace Buffer:</strong> When {data?.inactivityDays ?? 90} days expire without signal, the {data?.gracePeriodDays ?? 14}-day warning period starts and alerts are dispatched.
                  </p>
                  <p className="text-xs text-secondary leading-relaxed">
                    3. <strong>Execution Phase:</strong> If the grace period elapses without owner response, the timelock releases USDC directly to designated heirs.
                  </p>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Beneficiaries & Heirs */}
        {activeTab === 'beneficiaries' && (
          <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md">
              <div>
                <h3 className="text-heading-xs font-semibold text-primary">Designated Beneficiaries & Heirs</h3>
                <p className="text-xs text-secondary mt-xxs">Specify Base recipient addresses and the split of USDC assets upon switch execution</p>
              </div>
              <button
                onClick={() => setShowAddBeneficiaryModal(true)}
                className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <Plus className="w-4 h-4 text-fg-white shrink-0" />
                <span>Add Beneficiary</span>
              </button>
            </div>

            {/* Table of Beneficiaries */}
            <div className="overflow-hidden rounded-xl border border-secondary bg-primary">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr className="border-b border-secondary text-left">
                    <th className="px-3xl py-md text-sm font-semibold text-quaternary">Recipient / Label</th>
                    <th className="px-3xl py-md text-sm font-semibold text-quaternary">Base Address</th>
                    <th className="px-3xl py-md text-sm font-semibold text-quaternary">Share (%)</th>
                    <th className="px-3xl py-md text-sm font-semibold text-quaternary">Allocation (USDC)</th>
                    <th className="px-3xl py-md text-sm font-semibold text-quaternary">Status</th>
                    <th className="px-3xl py-md text-sm font-semibold text-quaternary text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary">
                  {data?.beneficiaries.map((b) => (
                    <tr key={b.id} className="hover:bg-secondary-hover transition">
                      <td className="px-3xl py-xl text-md text-primary font-medium">{b.label}</td>
                      <td className="px-3xl py-xl text-md text-tertiary font-mono">{b.address}</td>
                      <td className="px-3xl py-xl text-md text-primary font-semibold">{b.sharePercent}%</td>
                      <td className="px-3xl py-xl text-md text-primary font-medium">
                        ${(( (data?.usdcBalance ?? 0) * b.sharePercent) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3xl py-xl text-md">
                        <span className={`inline-flex items-center gap-xs rounded-full px-md py-xxs text-xs font-medium border ${
                          b.status === 'Claimed'
                            ? 'border-utility-success-200 bg-utility-success-50 text-utility-success-700'
                            : b.status === 'Eligible'
                            ? 'border-utility-warning-200 bg-utility-warning-50 text-utility-warning-700'
                            : 'border-utility-gray-200 bg-utility-gray-50 text-secondary'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-3xl py-xl text-md text-right">
                        <button
                          onClick={() => handleRemoveBeneficiary(b.id)}
                          className="inline-flex items-center gap-xs text-xs font-semibold text-error-primary hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-fg-error-primary" />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-md rounded-lg bg-secondary border border-secondary flex items-center justify-between text-xs">
              <span className="text-secondary">
                Total Allocation: <strong className="text-primary font-semibold">{totalAllocation}%</strong>
              </span>
              <span className={totalAllocation === 100 ? 'text-utility-success-700 font-medium' : 'text-utility-warning-700 font-medium'}>
                {totalAllocation === 100 ? 'Fully Allocated (100%)' : `Warning: Total allocation is ${totalAllocation}% (should equal 100%)`}
              </span>
            </div>
          </section>
        )}

        {/* TAB 3: Switch Parameters & Simulation */}
        {activeTab === 'settings' && (
          <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-xl">
            <div>
              <h3 className="text-heading-xs font-semibold text-primary">Switch Parameters & Triggers</h3>
              <p className="text-xs text-secondary mt-xxs">Configure the check-in timer interval and grace period for the Base timelock</p>
            </div>

            <form onSubmit={handleUpdateSettings} className="grid grid-cols-1 md:grid-cols-2 gap-xl">
              <div className="flex flex-col gap-sm">
                <label className="text-sm font-medium text-secondary">Inactivity Cadence (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={customInactivity}
                  onChange={(e) => setCustomInactivity(Number(e.target.value))}
                  className="rounded-md bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
                <p className="text-xs text-tertiary">
                  Consecutive days of inactivity before entering the warning and grace period.
                </p>
              </div>

              <div className="flex flex-col gap-sm">
                <label className="text-sm font-medium text-secondary">Grace Period Buffer (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={customGrace}
                  onChange={(e) => setCustomGrace(Number(e.target.value))}
                  className="rounded-md bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
                <p className="text-xs text-tertiary">
                  Buffer period for owner to cancel false triggers before funds become claimable.
                </p>
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={actionLoading === 'settings'}
                  className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
                >
                  <Sliders className="w-4 h-4 text-fg-white shrink-0" />
                  <span>{actionLoading === 'settings' ? 'Saving...' : 'Update Switch Parameters'}</span>
                </button>
              </div>
            </form>

            {/* Test Scenarios & Simulation Controls */}
            <div className="pt-xl border-t border-secondary space-y-md">
              <div>
                <h4 className="text-sm font-semibold text-primary">Testnet & Live Scenario Simulator</h4>
                <p className="text-xs text-secondary mt-xxs">Simulate on-chain time progression without waiting months to verify vault behavior</p>
              </div>

              <div className="flex flex-wrap items-center gap-md">
                <button
                  onClick={() => handleSimulate('warning')}
                  disabled={actionLoading === 'simulate'}
                  className="inline-flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <AlertTriangle className="w-4 h-4 text-fg-warning-primary shrink-0" />
                  <span>Fast-Forward to Warning State</span>
                </button>

                <button
                  onClick={() => handleSimulate('trigger')}
                  disabled={actionLoading === 'simulate'}
                  className="inline-flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <ShieldAlert className="w-4 h-4 text-fg-error-primary shrink-0" />
                  <span>Fast-Forward to Triggered (Claimable)</span>
                </button>

                <button
                  onClick={() => handleSimulate('reset')}
                  disabled={actionLoading === 'simulate'}
                  className="inline-flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <CheckCircle2 className="w-4 h-4 text-fg-success-primary shrink-0" />
                  <span>Reset to Active (Today)</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: History / Audit Trail */}
        {activeTab === 'history' && (
          <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs space-y-xl">
            <div>
              <h3 className="text-heading-xs font-semibold text-primary">Audit Trail & On-Chain Events</h3>
              <p className="text-xs text-secondary mt-xxs">Immutable activity log of check-in heartbeats, parameter adjustments, and funding transactions</p>
            </div>

            <div className="space-y-md">
              {data?.activities.map((act) => (
                <div key={act.id} className="p-md rounded-lg bg-secondary border border-secondary flex items-start justify-between">
                  <div className="flex items-start gap-md">
                    <div className="p-xs rounded-lg bg-utility-brand-50 border border-utility-brand-200 mt-xxs">
                      {act.type === 'ping' ? (
                        <HeartPulse className="w-4 h-4 text-fg-brand-primary" />
                      ) : act.type === 'deposit' ? (
                        <Coins className="w-4 h-4 text-fg-brand-primary" />
                      ) : (
                        <Sliders className="w-4 h-4 text-fg-brand-primary" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-primary">{act.title}</div>
                      <div className="text-xs text-secondary mt-xxs">{act.detail}</div>
                      {act.txHash && (
                        <a
                          href={`https://basescan.org/tx/${act.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-brand-primary hover:underline mt-xxs flex items-center gap-xxs"
                        >
                          <span>{act.txHash}</span>
                          <ExternalLink className="w-3 h-3 text-fg-brand-primary" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-tertiary">{new Date(act.timestamp).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Ping Check-In Modal */}
      {showPingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-md">
          <div className="rounded-xl border border-secondary bg-primary shadow-xl max-w-md w-full p-xl space-y-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-xs">
                <HeartPulse className="w-5 h-5 text-fg-brand-primary" />
                <h3 className="text-heading-xs font-bold text-primary">Proof-of-Life Check In</h3>
              </div>
              <button onClick={() => setShowPingModal(false)} className="text-tertiary hover:text-primary text-sm font-semibold">
                ✕
              </button>
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              Submitting a check-in proves active ownership and resets the inactivity countdown for another {data?.inactivityDays ?? 90} days on Base.
            </p>

            <div className="p-md rounded-lg bg-secondary border border-secondary text-xs space-y-xs">
              <div className="flex justify-between">
                <span className="text-secondary">Network:</span>
                <span className="font-medium text-primary">Base Mainnet (8453)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Reset Cadence:</span>
                <span className="font-medium text-primary">{data?.inactivityDays ?? 90} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Est. Gas:</span>
                <span className="font-medium text-primary">&lt; $0.01 (Base L2)</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-md pt-sm">
              <button
                onClick={() => setShowPingModal(false)}
                className="inline-flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Cancel
              </button>
              <button
                onClick={handlePing}
                disabled={actionLoading === 'ping'}
                className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
              >
                <HeartPulse className="w-4 h-4 text-fg-white shrink-0" />
                <span>Confirm Check-In</span>
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
                <h3 className="text-heading-xs font-bold text-primary">Deposit USDC to Vault</h3>
              </div>
              <button onClick={() => setShowDepositModal(false)} className="text-tertiary hover:text-primary text-sm font-semibold">
                ✕
              </button>
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              Deposit native USDC on Base to expand your inheritance vault's locked reserves.
            </p>

            <div className="flex flex-col gap-sm">
              <label className="text-sm font-medium text-secondary">Deposit Amount (USDC)</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="1000.00"
                className="rounded-md bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
              />
              <p className="text-xs text-tertiary">USDC Contract: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913</p>
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
                  if (data) {
                    setData({
                      ...data,
                      usdcBalance: data.usdcBalance + Number(depositAmount || 0),
                    });
                  }
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

      {/* Add Beneficiary Modal */}
      {showAddBeneficiaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-md">
          <div className="rounded-xl border border-secondary bg-primary shadow-xl max-w-md w-full p-xl space-y-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-xs">
                <Users className="w-5 h-5 text-fg-brand-primary" />
                <h3 className="text-heading-xs font-bold text-primary">Add Beneficiary</h3>
              </div>
              <button onClick={() => setShowAddBeneficiaryModal(false)} className="text-tertiary hover:text-primary text-sm font-semibold">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBeneficiary} className="space-y-md">
              <div className="flex flex-col gap-sm">
                <label className="text-sm font-medium text-secondary">Label / Relation</label>
                <input
                  type="text"
                  required
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Eldest Child, Sibling, Legal Trust"
                  className="rounded-md bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
              </div>

              <div className="flex flex-col gap-sm">
                <label className="text-sm font-medium text-secondary">Base Address</label>
                <input
                  type="text"
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="0x..."
                  className="rounded-md bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring font-mono"
                />
              </div>

              <div className="flex flex-col gap-sm">
                <label className="text-sm font-medium text-secondary">Share (%)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={newShare}
                  onChange={(e) => setNewShare(Number(e.target.value))}
                  placeholder="25"
                  className="rounded-md bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder border border-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
              </div>

              <div className="flex items-center justify-end gap-md pt-sm">
                <button
                  type="button"
                  onClick={() => setShowAddBeneficiaryModal(false)}
                  className="inline-flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'addBen'}
                  className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
                >
                  <span>Add Heir</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
