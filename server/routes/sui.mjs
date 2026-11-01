import { Router } from 'express'
import { SuiGraphQLClient } from '@mysten/sui/graphql'
import { createSuiClient, MissingTatumKeyError, suiNetworkStatus } from '../sui-client.mjs'

const router = Router()
const SUI_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{1,64}$/
const TESTNET_PACKAGE_ID =
  '0x9c87cf7116c2302ee1ad8fe5903d4f4ce957656b0fbcf9718319e45c30855ed0'
const TESTNET_GRAPHQL_URL = 'https://graphql.testnet.sui.io/graphql'

function normalizeAddress(address) {
  return `0x${address.slice(2).toLowerCase().padStart(64, '0')}`
}

function eventObjectId(value) {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const fields = value
  for (const key of ['bytes', 'id']) {
    const id = eventObjectId(fields[key])
    if (id) return id
  }
  return null
}

router.get('/status', (_req, res) => {
  res.json(suiNetworkStatus())
})

router.get('/testnet/vaults/:address', async (req, res) => {
  const { address } = req.params
  if (!SUI_ADDRESS_PATTERN.test(address)) {
    return res.status(400).json({ error: 'Address must be a valid Sui address.' })
  }

  const owner = normalizeAddress(address)
  const client = new SuiGraphQLClient({ url: TESTNET_GRAPHQL_URL, network: 'testnet' })
  const vaultIds = new Set()
  let before
  let pages = 0

  try {
    do {
      const result = await client.listEvents({
        filter: { eventType: `${TESTNET_PACKAGE_ID}::vault::VaultCreated` },
        limit: 50,
        order: 'descending',
        before,
      })
      for (const event of result.events) {
        const data = event.json
        if (!data || typeof data.owner !== 'string' || normalizeAddress(data.owner) !== owner) continue
        const objectId = eventObjectId(data.vault_id)
        if (objectId && SUI_ADDRESS_PATTERN.test(objectId)) vaultIds.add(normalizeAddress(objectId))
      }

      pages += 1
      if (!result.hasNextPage) break
      if (!result.endCursor || pages >= 100) {
        return res.status(503).json({
          error: 'The Testnet vault history is too large to scan in one request. Try refreshing later.',
        })
      }
      before = result.endCursor
    } while (true)

    return res.json({ owner, vaultIds: [...vaultIds] })
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown GraphQL error'
    console.error(`Sui Testnet vault event query failed: ${details}`)
    return res.status(502).json({ error: 'Unable to load the Testnet vault history.' })
  }
})

router.get('/:network/balance/:address', async (req, res) => {
  const { network, address } = req.params

  if (network !== 'mainnet' && network !== 'testnet') {
    return res.status(400).json({ error: 'Network must be mainnet or testnet.' })
  }

  if (!SUI_ADDRESS_PATTERN.test(address)) {
    return res.status(400).json({ error: 'Address must be a valid Sui address.' })
  }

  const normalizedAddress = `0x${address.slice(2).padStart(64, '0')}`
  let suiClient
  try {
    suiClient = createSuiClient(network)
  } catch (error) {
    if (error instanceof MissingTatumKeyError) {
      return res.status(503).json({
        error: 'Mainnet balance reads are unavailable because the Tatum key is not configured.',
      })
    }
    const details = error instanceof Error ? error.message : 'Unknown client error'
    console.error(`Unable to create Sui ${network} client: ${details}`)
    return res.status(502).json({ error: `Unable to connect to the ${network} Sui RPC.`, details })
  }

  try {
    const result = await suiClient.client.getBalance({ owner: normalizedAddress })
    res.json({
      address: normalizedAddress,
      network,
      coinType: result.balance.coinType,
      totalBalanceMist: result.balance.balance,
      provider: network === 'mainnet' ? 'Tatum Sui Mainnet gRPC' : 'Sui Testnet gRPC',
    })
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown RPC error'
    console.error(`Sui ${network} balance query failed: ${details}`)
    res.status(502).json({ error: `Unable to read the ${network} SUI balance.`, details })
  } finally {
    suiClient.close()
  }
})

export default router
