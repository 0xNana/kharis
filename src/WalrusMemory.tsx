import { useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, LockKeyhole, Trash2 } from 'lucide-react'
import type { MemWal as MemWalClient, RecallMemory } from '@mysten-incubation/memwal'

const WALRUS_MEMORY_ENABLED = import.meta.env.VITE_WALRUS_MEMORY_ENABLED === 'true'
const NAMESPACE = 'kharis'
const MAX_MEMORY_LENGTH = 2000

export default function WalrusMemory() {
  const client = useRef<MemWalClient | null>(null)
  const [accountId, setAccountId] = useState('')
  const [delegateKey, setDelegateKey] = useState('')
  const [memoryText, setMemoryText] = useState('')
  const [query, setQuery] = useState('')
  const [recallResults, setRecallResults] = useState<RecallMemory[]>([])
  const [consent, setConsent] = useState(false)
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [writesThisSession, setWritesThisSession] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const clearSession = () => {
    client.current?.destroy()
    client.current = null
    setAccountId('')
    setDelegateKey('')
    setMemoryText('')
    setQuery('')
    setRecallResults([])
    setConsent(false)
    setConnected(false)
    setWritesThisSession(0)
    setError(null)
    setNotice('Disconnected. Your key was cleared from this page.')
  }

  const connect = async () => {
    setBusy(true)
    setError(null)
    setNotice(null)
    let nextClient: MemWalClient | null = null
    try {
      const { MemWal } = await import('@mysten-incubation/memwal')
      nextClient = MemWal.create({
        key: delegateKey.trim(),
        accountId: accountId.trim(),
        serverUrl: 'https://relayer.memory.walrus.xyz',
        namespace: NAMESPACE,
      })
      await nextClient.health()
      client.current?.destroy()
      client.current = nextClient
      nextClient = null
      setConnected(true)
      setNotice('Connected to Walrus Memory.')
    } catch {
      nextClient?.destroy()
      setError('We couldn’t connect. Check your account details and try again.')
    } finally {
      setBusy(false)
    }
  }

  const remember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!client.current || !consent) return
    const text = memoryText.trim()
    if (text.length < 5 || text.length > MAX_MEMORY_LENGTH) {
      setError(`Your note must be 5–${MAX_MEMORY_LENGTH} characters long.`)
      return
    }

    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await client.current.rememberAndWait(text, { timeoutMs: 60_000 })
      setWritesThisSession((count) => count + 1)
      setMemoryText('')
      setNotice('Your note is saved on Walrus.')
    } catch {
      setError('We couldn’t save your note. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const recall = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!client.current || !consent || !query.trim()) return

    setBusy(true)
    setError(null)
    setNotice(null)
    setRecallResults([])
    try {
      const result = await client.current.recall({
        query: query.trim(),
        limit: 5,
        namespace: NAMESPACE,
      })
      setRecallResults(result.results)
      setNotice(result.results.length ? `Found ${result.results.length} ${result.results.length === 1 ? 'note' : 'notes'}.` : 'No matching notes found.')
    } catch {
      setError('We couldn’t find your notes. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="rounded-xl border border-secondary bg-primary p-xl shadow-xs">
      <div className="flex items-start gap-md">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-utility-gray-200 bg-utility-gray-50 text-utility-gray-700">
          <LockKeyhole size={20} aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-heading-xs font-semibold text-primary">Walrus Memory</h2>
          <p className="mt-xs text-sm leading-relaxed text-secondary">
            Save and find notes on Walrus. Your key stays on this page. Notes saved during this visit:
            {' '}{writesThisSession}.
          </p>
        </div>
      </div>

      {!WALRUS_MEMORY_ENABLED ? (
        <div className="mt-lg flex items-start gap-md rounded-lg border border-utility-warning-200 bg-utility-warning-50 p-lg text-utility-warning-700">
          <AlertTriangle size={18} className="mt-xxs shrink-0" aria-hidden="true" />
          <p className="text-sm">
            Walrus Memory isn’t available yet.
          </p>
        </div>
      ) : !connected ? (
        <div className="mt-lg space-y-md">
          <div className="flex flex-col gap-sm">
            <label htmlFor="memwal-account" className="text-sm font-medium text-secondary">Account ID</label>
            <input
              id="memwal-account"
              autoComplete="off"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="rounded-md border border-primary bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder focus-visible:ring-2 focus-visible:ring-focus-ring"
              placeholder="Your Walrus account ID"
            />
          </div>
          <div className="flex flex-col gap-sm">
            <label htmlFor="memwal-key" className="text-sm font-medium text-secondary">Private key</label>
            <input
              id="memwal-key"
              type="password"
              autoComplete="new-password"
              value={delegateKey}
              onChange={(event) => setDelegateKey(event.target.value)}
              className="rounded-md border border-primary bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder focus-visible:ring-2 focus-visible:ring-focus-ring"
              placeholder="Paste your private key"
            />
            <p className="text-xs text-tertiary">
              Your key is used only while this page is open and isn’t saved by Kharis. The Walrus
              service can read notes before they’re encrypted. Never save sensitive information.
            </p>
          </div>
          <label className="flex items-start gap-sm text-xs leading-relaxed text-secondary">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-xxs size-4 shrink-0 accent-brand"
            />
            <span>
              I understand the Walrus service can read my notes before encryption. I will not
              save sensitive information.
            </span>
          </label>
          <button
            type="button"
            onClick={connect}
            disabled={busy || !accountId.trim() || !delegateKey.trim() || !consent}
            className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Connecting…' : 'Connect account'}
          </button>
        </div>
      ) : (
        <div className="mt-lg space-y-lg">
          <div className="flex flex-wrap items-center justify-between gap-md border-b border-secondary pb-md">
            <span className="inline-flex items-center gap-xs rounded-full border border-utility-success-200 bg-utility-success-50 px-md py-xxs text-xs font-medium text-utility-success-700">
              <CheckCircle2 size={14} aria-hidden="true" />
              Connected to Walrus Mainnet
            </span>
            <button
              type="button"
              onClick={clearSession}
              className="inline-flex items-center gap-xs rounded-lg bg-primary px-md py-xs text-xs font-semibold text-secondary border border-primary hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <Trash2 size={14} aria-hidden="true" />
              Disconnect
            </button>
          </div>

          <form onSubmit={remember} className="space-y-sm">
            <label htmlFor="memory-text" className="text-sm font-medium text-secondary">Save a note</label>
            <p className="text-xs text-tertiary">
              Never save wallet keys, balances, beneficiary details, or sensitive family information.
              Walrus services can read notes before encryption.
            </p>
            <textarea
              id="memory-text"
              value={memoryText}
              onChange={(event) => setMemoryText(event.target.value)}
              maxLength={MAX_MEMORY_LENGTH}
              rows={3}
              className="w-full resize-y rounded-md border border-primary bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder focus-visible:ring-2 focus-visible:ring-focus-ring"
              placeholder="For example: I prefer concise explanations."
            />
            <div className="flex flex-wrap items-center justify-between gap-md">
              <span className="text-xs text-tertiary">{memoryText.length}/{MAX_MEMORY_LENGTH}</span>
              <button
                type="submit"
                disabled={busy || !memoryText.trim() || !consent}
                className="inline-flex items-center gap-sm rounded-lg border border-transparent bg-brand-solid px-lg py-sm text-sm font-semibold text-primary-on-brand shadow-xs hover:bg-brand-solid-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </form>

          <form onSubmit={recall} className="space-y-sm border-t border-secondary pt-lg">
            <label htmlFor="memory-query" className="text-sm font-medium text-secondary">Find a saved note</label>
            <div className="flex flex-col items-stretch gap-sm sm:flex-row sm:items-end">
              <input
                id="memory-query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 rounded-md border border-primary bg-primary px-lg py-sm text-sm text-primary placeholder:text-placeholder focus-visible:ring-2 focus-visible:ring-focus-ring"
                placeholder="What kind of explanations do I prefer?"
              />
              <button
                type="submit"
                disabled={busy || !query.trim() || !consent}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-lg py-sm text-sm font-semibold text-secondary border border-primary shadow-xs hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Searching…' : 'Search'}
              </button>
            </div>
          </form>

          {recallResults.length > 0 && (
            <ul className="space-y-sm" aria-label="Recalled Walrus memories">
              {recallResults.map((item) => (
                <li key={item.blob_id} className="rounded-lg border border-secondary bg-secondary p-md">
                  <p className="whitespace-pre-wrap text-sm text-primary">{item.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="mt-lg text-sm text-error-primary" role="alert">{error}</p>}
      {notice && <p className="mt-lg text-sm text-secondary" role="status">{notice}</p>}
    </article>
  )
}
