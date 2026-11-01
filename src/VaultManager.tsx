import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react'
import { Transaction } from '@mysten/sui/transactions'

type VaultPageMode = 'vault' | 'beneficiaries'
type SuiNetwork = 'testnet' | 'mainnet'

interface BeneficiaryDraft {
  address: string
  percent: string
}

interface VaultDetails {
  id: string
  owner: string
  balanceMist: string
  lastCheckinMs: number
  inactivityPeriodMs: number
  gracePeriodMs: number
  recipients: string[]
  sharesBps: number[]
  released: boolean
  payoutComplete: boolean
}

const PACKAGE_ID =
  '0x9c87cf7116c2302ee1ad8fe5903d4f4ce957656b0fbcf9718319e45c30855ed0'
const PACKAGE_URL = `https://suiscan.xyz/testnet/object/${PACKAGE_ID}`
const VAULT_TYPE = `${PACKAGE_ID}::vault::Vault`
const VAULT_CALL = `${PACKAGE_ID}::vault`
const CLOCK_ID = '0x6'
const MAX_BENEFICIARIES = 10
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{1,64}$/
const TESTNET_TRANSACTIONS_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_SUI_TESTNET_TRANSACTIONS_ENABLED === 'true'

function normalizeAddress(address: string) {
  return `0x${address.slice(2).toLowerCase().padStart(64, '0')}`
}

function toRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`We couldn't load your ${label}. Refresh and try again.`)
  }
  return value as Record<string, unknown>
}

function toString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`We couldn't read your ${label}. Refresh and try again.`)
  }
  return value
}

function toMilliseconds(value: unknown, label: string): number {
  const parsed = Number(toString(value, label))
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`We couldn't read your ${label}. Refresh and try again.`)
  }
  return parsed
}

function parseVault(id: string, value: unknown): VaultDetails {
  const fields = toRecord(value, 'vault')
  const balance = toRecord(fields.balance, 'vault balance')
  if (!Array.isArray(fields.recipients) || !Array.isArray(fields.shares_bps)) {
    throw new Error('We couldn’t load your beneficiaries. Refresh and try again.')
  }
  if (typeof fields.released !== 'boolean' || typeof fields.payout_complete !== 'boolean') {
    throw new Error('We couldn’t load your vault status. Refresh and try again.')
  }

  const recipients = fields.recipients.map((address) => toString(address, 'beneficiary address'))
  const sharesBps = fields.shares_bps.map((share) => toMilliseconds(share, 'beneficiary share'))
  if (recipients.length !== sharesBps.length) {
    throw new Error('We couldn’t load your beneficiaries. Refresh and try again.')
  }

  return {
    id,
    owner: toString(fields.owner, 'vault owner'),
    balanceMist: toString(balance.value, 'vault balance'),
    lastCheckinMs: toMilliseconds(fields.last_checkin_ms, 'last check-in time'),
    inactivityPeriodMs: toMilliseconds(fields.inactivity_period_ms, 'inactivity period'),
    gracePeriodMs: toMilliseconds(fields.grace_period_ms, 'grace period'),
    recipients,
    sharesBps,
    released: fields.released,
    payoutComplete: fields.payout_complete,
  }
}

function formatSui(mist: string) {
  const amount = BigInt(mist)
  const whole = amount / 1_000_000_000n
  const fraction = (amount % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

function toMist(sui: string) {
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,9}))?$/.exec(sui.trim())
  if (!match) throw new Error('Enter an amount with up to 9 decimal places.')
  return BigInt(match[1]) * 1_000_000_000n + BigInt((match[2] ?? '').padEnd(9, '0') || '0')
}

function getBeneficiaries(addresses: BeneficiaryDraft[]) {
  if (addresses.length < 1 || addresses.length > MAX_BENEFICIARIES) {
    throw new Error(`Add between 1 and ${MAX_BENEFICIARIES} beneficiaries.`)
  }
  const normalized = addresses.map(({ address }) => {
    const trimmed = address.trim()
    if (!ADDRESS_PATTERN.test(trimmed)) throw new Error('Enter a valid wallet address for each beneficiary.')
    return normalizeAddress(trimmed)
  })
  if (new Set(normalized).size !== normalized.length) {
    throw new Error('Each person must have a different wallet address.')
  }

  const shares = addresses.map(({ percent }) => {
    const parsed = Number(percent)
    if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed * 100)) {
      throw new Error('Each share must be greater than 0% and can have up to 2 decimal places.')
    }
    return parsed * 100
  })
  if (shares.reduce((total, share) => total + share, 0) !== 10_000) {
    throw new Error('Shares must add up to exactly 100%.')
  }

  return { addresses: normalized, shares }
}

function InlineAlert({
  title,
  children,
  tone,
}: {
  title: string
  children: React.ReactNode
  tone: 'error' | 'warning' | 'success' | 'brand'
}) {
  const styles = {
    error: 'bg-utility-error-50 text-utility-error-700',
    warning: 'bg-utility-warning-50 text-utility-warning-700',
    success: 'bg-utility-success-50 text-utility-success-700',
    brand: 'bg-utility-brand-50 text-utility-brand-700',
  }[tone]
  const Icon = tone === 'success' ? CheckCircle2 : AlertTriangle

  return (
    <div className={`flex items-start gap-md rounded-lg p-lg ${styles}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={18} className="mt-xxs shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <div className="mt-xxs break-words text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  min,
  max,
  step,
  placeholder,
  disabled = false,
  id: explicitId,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'number'
  min?: number
  max?: number
  step?: number | string
  placeholder?: string
  disabled?: boolean
  id?: string
}) {
  const id = explicitId ?? `vault-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-sm text-sm font-medium text-secondary">
      {label}
      <input
        id={id}
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 rounded-md border border-primary bg-primary px-lg py-sm text-sm font-regular text-primary placeholder:text-placeholder focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:bg-disabled-subtle disabled:text-disabled"
      />
    </label>
  )
}

export default function VaultManager({
  mode,
  network,
}: {
  mode: VaultPageMode
  network: SuiNetwork
}) {
  const account = useCurrentAccount()
  const dAppKit = useDAppKit()
  const [vaultIds, setVaultIds] = useState<string[]>([])
  const [selectedVaultId, setSelectedVaultId] = useState('')
  const [vault, setVault] = useState<VaultDetails | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingVault, setLoadingVault] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [inactivityDays, setInactivityDays] = useState('90')
  const [graceDays, setGraceDays] = useState('14')
  const [depositAmount, setDepositAmount] = useState('')
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryDraft[]>([
    { address: '', percent: '100' },
  ])
  const [now, setNow] = useState(Date.now())

  const refreshVaults = useCallback(async (signal?: AbortSignal) => {
    if (!account?.address) {
      setVaultIds([])
      setSelectedVaultId('')
      setVault(null)
      setLoadError(null)
      return
    }

    setLoadingList(true)
    setLoadError(null)
    try {
      const response = await fetch(`/api/sui/testnet/vaults/${encodeURIComponent(account.address)}`, {
        signal,
      })
      const body: unknown = await response.json()
      if (signal?.aborted) return
      if (!response.ok) {
        const details = toRecord(body, 'vault list error')
        throw new Error(typeof details.error === 'string' ? details.error : 'We couldn’t load your vaults. Try again.')
      }
      const result = toRecord(body, 'vault list')
      if (!Array.isArray(result.vaultIds) || !result.vaultIds.every((id) => typeof id === 'string')) {
        throw new Error('We couldn’t find your vaults. Refresh and try again.')
      }
      if (signal?.aborted) return
      const ids = result.vaultIds
      setVaultIds(ids)
      setSelectedVaultId((current) => (current && ids.includes(current) ? current : ids[0] ?? ''))
      if (ids.length === 0) setVault(null)
    } catch (error) {
      if (signal?.aborted) return
      setLoadError(error instanceof Error ? error.message : 'We couldn’t load your vaults. Try again.')
    } finally {
      if (!signal?.aborted) setLoadingList(false)
    }
  }, [account?.address])

  useEffect(() => {
    const controller = new AbortController()
    void refreshVaults(controller.signal)
    return () => controller.abort()
  }, [refreshVaults])

  useEffect(() => {
    if (!selectedVaultId) {
      setVault(null)
      return
    }

    let active = true
    setLoadingVault(true)
    setLoadError(null)
    dAppKit
      .getClient('testnet')
      .getObject({ objectId: selectedVaultId, include: { json: true } })
      .then(({ object }) => {
        if (!active) return
        if (object.type !== VAULT_TYPE) throw new Error('This vault is unavailable. Refresh and try again.')
        setVault(parseVault(selectedVaultId, object.json))
      })
      .catch((error: unknown) => {
        if (active) {
          setVault(null)
          setLoadError('We couldn’t load this vault. Refresh and try again.')
        }
      })
      .finally(() => {
        if (active) setLoadingVault(false)
      })

    return () => {
      active = false
    }
  }, [dAppKit, selectedVaultId])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!vault) return
    setBeneficiaries(
      vault.recipients.map((address, index) => ({
        address,
        percent: (vault.sharesBps[index] / 100).toFixed(2).replace(/\.?0+$/, ''),
      })),
    )
  }, [vault?.id, vault?.recipients, vault?.sharesBps])

  const isOwner =
    !!account?.address && !!vault && normalizeAddress(account.address) === normalizeAddress(vault.owner)
  const releaseAt = vault ? vault.lastCheckinMs + vault.inactivityPeriodMs + vault.gracePeriodMs : 0
  const releaseReady = !!vault && now >= releaseAt
  const selectedLabel = useMemo(
    () => (id: string) => `${id.slice(0, 8)}…${id.slice(-6)}`,
    [],
  )

  const signTransaction = async (transaction: Transaction, successMessage: string) => {
    if (!account) throw new Error('Connect your wallet to continue.')
    if (network !== 'testnet' || !TESTNET_TRANSACTIONS_ENABLED) {
      throw new Error('Vault actions are temporarily unavailable.')
    }

    setBusy(true)
    setActionError(null)
    setNotice(null)
    try {
      const result = await dAppKit.signAndExecuteTransaction({ transaction, network: 'testnet' })
      if (result.$kind === 'FailedTransaction') {
        throw new Error('Your action could not be completed.')
      }
      const digest = result.Transaction.digest
      await dAppKit.getClient('testnet').waitForTransaction({ digest })
      setNotice(successMessage)
      await refreshVaults()
      if (selectedVaultId) {
        const { object } = await dAppKit
          .getClient('testnet')
          .getObject({ objectId: selectedVaultId, include: { json: true } })
        if (object.type !== VAULT_TYPE) throw new Error('This vault is unavailable. Refresh and try again.')
        setVault(parseVault(selectedVaultId, object.json))
      }
    } catch (error) {
      console.error('Sui Testnet vault action failed:', error)
      setActionError('We couldn’t complete that action. Check your wallet and try again.')
    } finally {
      setBusy(false)
    }
  }

  const createVault = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setActionError(null)
    try {
      const inactivity = Number(inactivityDays)
      const grace = Number(graceDays)
      if (!Number.isInteger(inactivity) || inactivity < 7 || inactivity > 3650) {
        throw new Error('Choose a check-in period between 7 and 3,650 days.')
      }
      if (!Number.isInteger(grace) || grace < 0 || grace > 3650) {
        throw new Error('Choose an additional grace period between 0 and 3,650 days.')
      }
      const { addresses, shares } = getBeneficiaries(beneficiaries)
      const transaction = new Transaction()
      transaction.moveCall({
        target: `${VAULT_CALL}::create_vault`,
        arguments: [
          transaction.pure.vector('address', addresses),
          transaction.pure.vector('u64', shares),
          transaction.pure.u64(inactivity),
          transaction.pure.u64(grace),
          transaction.object(CLOCK_ID),
        ],
      })
      await signTransaction(transaction, 'Your vault is ready.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'We couldn’t create your vault. Try again.')
    }
  }

  const checkIn = async () => {
    if (!vault) return
    const transaction = new Transaction()
    transaction.moveCall({
      target: `${VAULT_CALL}::check_in`,
      arguments: [transaction.object(vault.id), transaction.object(CLOCK_ID)],
    })
    await signTransaction(transaction, 'You’re checked in.')
  }

  const updateBeneficiaries = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!vault) return
    setActionError(null)
    try {
      const { addresses, shares } = getBeneficiaries(beneficiaries)
      const transaction = new Transaction()
      transaction.moveCall({
        target: `${VAULT_CALL}::set_beneficiaries`,
        arguments: [
          transaction.object(vault.id),
          transaction.pure.vector('address', addresses),
          transaction.pure.vector('u64', shares),
          transaction.object(CLOCK_ID),
        ],
      })
      await signTransaction(transaction, 'Your beneficiaries are updated.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'We couldn’t update your beneficiaries. Try again.')
    }
  }

  const deposit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!vault) return
    setActionError(null)
    try {
      const amount = toMist(depositAmount)
      if (amount <= 0n) throw new Error('Enter an amount greater than 0 SUI.')
      const transaction = new Transaction()
      const [coin] = transaction.splitCoins(transaction.gas, [transaction.pure.u64(amount)])
      transaction.moveCall({
        target: `${VAULT_CALL}::deposit`,
        arguments: [transaction.object(vault.id), coin],
      })
      await signTransaction(transaction, 'Your Testnet SUI is in the vault.')
      setDepositAmount('')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'We couldn’t add SUI. Try again.')
    }
  }

  const triggerRelease = async () => {
    if (!vault) return
    const transaction = new Transaction()
    transaction.moveCall({
      target: `${VAULT_CALL}::trigger_release`,
      arguments: [transaction.object(vault.id), transaction.object(CLOCK_ID)],
    })
    await signTransaction(transaction, 'Release has begun.')
  }

  const payAll = async () => {
    if (!vault) return
    const transaction = new Transaction()
    transaction.moveCall({
      target: `${VAULT_CALL}::pay_all`,
      arguments: [transaction.object(vault.id)],
    })
    await signTransaction(transaction, 'Your assets have been sent to your beneficiaries.')
  }

  const addBeneficiary = () => {
    setBeneficiaries((current) => [...current, { address: '', percent: '' }])
  }

  const updateDraft = (index: number, patch: Partial<BeneficiaryDraft>) => {
    setBeneficiaries((current) =>
      current.map((beneficiary, itemIndex) =>
        itemIndex === index ? { ...beneficiary, ...patch } : beneficiary,
      ),
    )
  }

  const renderBeneficiaryFields = (disabled: boolean) => (
    <div className="mt-lg space-y-md">
      {beneficiaries.map((beneficiary, index) => (
        <div key={index} className="grid gap-md sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
          <Field
            id={`vault-beneficiary-address-${index}`}
            label={`Person ${index + 1} wallet address`}
            value={beneficiary.address}
            onChange={(address) => updateDraft(index, { address })}
            placeholder="0x..."
            disabled={disabled}
          />
          <Field
            id={`vault-beneficiary-share-${index}`}
            label="Share (%)"
            type="number"
            min={0.01}
            max={100}
            step={0.01}
            value={beneficiary.percent}
            onChange={(percent) => updateDraft(index, { percent })}
            placeholder="100"
            disabled={disabled}
          />
          {beneficiaries.length > 1 && (
            <button
              type="button"
              onClick={() => setBeneficiaries((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              disabled={disabled}
              aria-label={`Remove beneficiary ${index + 1}`}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-primary bg-primary text-secondary hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      ))}
      {beneficiaries.length < MAX_BENEFICIARIES && (
        <button
          type="button"
          onClick={addBeneficiary}
          disabled={disabled}
          className="inline-flex items-center gap-sm rounded-lg border border-primary bg-primary px-lg py-sm text-sm font-semibold text-secondary hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} aria-hidden="true" />
          Add beneficiary
        </button>
      )}
      <p className="text-xs text-tertiary">
        Up to {MAX_BENEFICIARIES} unique addresses. Shares must total exactly 100%.
      </p>
    </div>
  )

  if (!account) {
    return (
      <InlineAlert title="Connect a Sui wallet" tone="brand">
        Connect your wallet to create or manage a vault.
      </InlineAlert>
    )
  }

  const isTestnet = network === 'testnet'
  const canTransact = isTestnet && TESTNET_TRANSACTIONS_ENABLED
  const vaultSelection = vaultIds.length > 0 && (
    <label className="flex min-w-0 flex-col gap-sm text-sm font-medium text-secondary">
      Select a Testnet vault
      <select
        value={selectedVaultId}
        onChange={(event) => setSelectedVaultId(event.target.value)}
        className="min-w-0 rounded-md border border-primary bg-primary px-lg py-sm text-sm text-primary focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        {vaultIds.map((id) => (
          <option key={id} value={id}>{selectedLabel(id)}</option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="flex flex-col gap-xl">
      {!isTestnet && (
        <InlineAlert title="Testnet only" tone="warning">
          Vaults are available on Sui Testnet only. Switch networks to continue.
        </InlineAlert>
      )}
      {isTestnet && !TESTNET_TRANSACTIONS_ENABLED && (
        <InlineAlert title="Vault actions unavailable" tone="brand">
          You can view your vault details, but actions are temporarily unavailable.
        </InlineAlert>
      )}
      <InlineAlert title="Sui Testnet only" tone="warning">
        This contract has not been audited. Never use real or valuable assets.
      </InlineAlert>
      {notice && <InlineAlert title="All set" tone="success">{notice}</InlineAlert>}
      {actionError && <InlineAlert title="Action couldn’t be completed" tone="error">{actionError}</InlineAlert>}
      {loadError && <InlineAlert title="Vault unavailable" tone="error">{loadError}</InlineAlert>}

      <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs sm:p-2xl">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div>
            <h2 className="text-md font-semibold text-primary">Your vaults</h2>
            <p className="mt-xs text-sm text-tertiary">Vaults linked to your wallet.</p>
          </div>
          <button
            type="button"
            onClick={() => void refreshVaults()}
            disabled={loadingList}
            className="inline-flex items-center gap-sm rounded-lg border border-primary bg-primary px-lg py-sm text-sm font-semibold text-secondary hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={16} className={`shrink-0 ${loadingList ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>
        {vaultSelection && <div className="mt-lg max-w-md">{vaultSelection}</div>}
        {loadingList || loadingVault ? (
          <p className="mt-lg text-sm text-secondary">Loading your vaults…</p>
        ) : !vault && vaultIds.length === 0 ? (
          <p className="mt-lg text-sm text-secondary">You don’t have a vault yet.</p>
        ) : null}
      </section>

      {mode === 'vault' && !vault && (
        <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs sm:p-2xl">
          <h2 className="text-md font-semibold text-primary">Create a vault</h2>
          <p className="mt-xs max-w-2xl text-sm leading-relaxed text-tertiary">
            Set a check-in schedule and choose who receives your assets. Creating a vault doesn’t add funds; confirm the details in your wallet.
          </p>
          <form
            onSubmit={(event) => void createVault(event)}
            className="mt-xl space-y-xl"
          >
            <div className="grid gap-lg sm:grid-cols-2">
              <Field
                label="Check-in period (days)"
                type="number"
                min={7}
                max={3650}
                step={1}
                value={inactivityDays}
                onChange={setInactivityDays}
                disabled={!isTestnet || busy}
              />
              <Field
                label="Additional grace period (days)"
                type="number"
                min={0}
                max={3650}
                step={1}
                value={graceDays}
                onChange={setGraceDays}
                disabled={!isTestnet || busy}
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary">Beneficiaries</h3>
              {renderBeneficiaryFields(!isTestnet || busy)}
            </div>
            <button
              type="submit"
              disabled={!canTransact || busy || loadingList || !beneficiaries[0]?.address.trim()}
              className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-xl py-md text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Confirm in your wallet…' : 'Create vault'}
            </button>
          </form>
        </section>
      )}

      {mode === 'beneficiaries' && !vault && !loadingList && (
        <InlineAlert title="Create a vault first" tone="brand">
          Add beneficiaries as part of vault setup, then manage their shares here.
          {' '}
          <a
            href="/app/vault"
            className="font-semibold underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Go to Your vault
          </a>
        </InlineAlert>
      )}

      {vault && (
        <>
          <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs sm:p-2xl">
            <div className="flex flex-wrap items-start justify-between gap-lg">
              <div className="min-w-0">
                <h2 className="text-md font-semibold text-primary">Your vault</h2>
                <p className="mt-xs break-all font-mono text-xs text-tertiary">{vault.id}</p>
              </div>
              <span className="inline-flex rounded-full border border-utility-warning-200 bg-utility-warning-50 px-md py-xxs text-xs font-medium text-utility-warning-700">
                {vault.released ? 'Ready to distribute' : 'Active · Testnet'}
              </span>
            </div>
            <dl className="mt-xl grid gap-lg border-t border-secondary pt-xl sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs text-tertiary">Vault balance</dt>
                <dd className="mt-xs text-sm font-semibold text-primary">{formatSui(vault.balanceMist)} SUI</dd>
              </div>
              <div>
                <dt className="text-xs text-tertiary">Last check-in</dt>
                <dd className="mt-xs text-sm font-semibold text-primary">{new Date(vault.lastCheckinMs).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-tertiary">Check-in period</dt>
                <dd className="mt-xs text-sm font-semibold text-primary">{vault.inactivityPeriodMs / 86_400_000} days</dd>
              </div>
              <div>
                <dt className="text-xs text-tertiary">Additional grace period</dt>
                <dd className="mt-xs text-sm font-semibold text-primary">{vault.gracePeriodMs / 86_400_000} days</dd>
              </div>
            </dl>
            <div className="mt-xl flex flex-wrap gap-md border-t border-secondary pt-xl">
              <button
                type="button"
                onClick={() => void checkIn()}
                disabled={!canTransact || !isOwner || vault.released || busy}
                className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Confirm in your wallet…' : 'Check in now'}
              </button>
              {!isOwner && <p className="self-center text-xs text-tertiary">Only the person who created this vault can make changes.</p>}
            </div>
            <p className="mt-md text-xs leading-relaxed text-tertiary">
              Release can begin after {new Date(releaseAt).toLocaleString()}. Timing is confirmed on Sui.
            </p>
          </section>

          {mode === 'beneficiaries' && (
            <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs sm:p-2xl">
              <h2 className="text-md font-semibold text-primary">Manage beneficiaries</h2>
              <p className="mt-xs text-sm text-tertiary">
                Changing who receives your assets resets your check-in date.
              </p>
              <form onSubmit={(event) => void updateBeneficiaries(event)} className="mt-lg">
                {renderBeneficiaryFields(!canTransact || !isOwner || vault.released || busy)}
                <button
                  type="submit"
                  disabled={!canTransact || !isOwner || vault.released || busy}
                  className="mt-xl inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? 'Confirm in your wallet…' : 'Save changes'}
                </button>
              </form>
            </section>
          )}

          {mode === 'vault' && isOwner && !vault.released && (
            <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs sm:p-2xl">
              <h2 className="text-md font-semibold text-primary">Add SUI</h2>
              <p className="mt-xs text-sm leading-relaxed text-tertiary">
                Use only Sui test tokens. Deposits are locked once release begins.
              </p>
              <form onSubmit={(event) => void deposit(event)} className="mt-lg flex flex-col gap-md sm:flex-row sm:items-end">
                <div className="w-full sm:max-w-xs">
                  <Field
                    label="Amount (SUI)"
                    type="number"
                    min={0}
                    step="0.000000001"
                    value={depositAmount}
                    onChange={setDepositAmount}
                    placeholder="0.1"
                    disabled={!canTransact || busy}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!canTransact || busy || !depositAmount}
                  className="inline-flex items-center justify-center gap-sm rounded-lg border border-primary bg-primary px-lg py-sm text-sm font-semibold text-secondary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add Testnet SUI
                </button>
              </form>
            </section>
          )}

          {mode === 'vault' && (
            <section className="rounded-xl border border-secondary bg-primary p-xl shadow-xs sm:p-2xl">
              <h2 className="text-md font-semibold text-primary">Passing assets on</h2>
              <p className="mt-xs text-sm leading-relaxed text-tertiary">
                After your check-in and grace periods, anyone can start the release. Your vault is then locked, and its remaining SUI is sent to your beneficiaries.
              </p>
              {!vault.released ? (
                <button
                  type="button"
                  onClick={() => void triggerRelease()}
                  disabled={!canTransact || !releaseReady || busy}
                  className="mt-lg inline-flex items-center gap-sm rounded-lg border border-primary bg-primary px-lg py-sm text-sm font-semibold text-secondary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {releaseReady ? 'Begin release' : 'Release available after set period'}
                </button>
              ) : vault.payoutComplete ? (
                <p className="mt-lg text-sm font-semibold text-secondary">Payout is complete.</p>
              ) : (
                <button
                  type="button"
                  onClick={() => void payAll()}
                  disabled={!canTransact || busy}
                  className="mt-lg inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? 'Confirm in your wallet…' : 'Send to beneficiaries'}
                </button>
              )}
            </section>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-lg text-xs text-tertiary">
        <a
          href={PACKAGE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-xs text-brand-primary hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          View contract on SuiScan
          <ExternalLink size={14} className="shrink-0" aria-hidden="true" />
        </a>
        <span>Package {PACKAGE_ID.slice(0, 10)}…</span>
      </div>
    </div>
  )
}
