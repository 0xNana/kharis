import { ChannelCredentials } from '@grpc/grpc-js'
import { GrpcTransport } from '@protobuf-ts/grpc-transport'
import { SuiGrpcClient } from '@mysten/sui/grpc'

const TESTNET_HOST = 'fullnode.testnet.sui.io:443'
const MAINNET_HOST = 'sui-mainnet-grpc.gateway.tatum.io:443'

export class MissingTatumKeyError extends Error {
  constructor(network) {
    super(`The ${network.toUpperCase()}_TATUM_API_KEY is not configured`)
    this.name = 'MissingTatumKeyError'
  }
}

export function suiNetworkStatus() {
  return {
    networks: {
      testnet: {
        available: true,
        provider: 'Sui Testnet gRPC',
        note: 'Public Sui endpoint; the configured Testnet Tatum key is not used because Tatum does not document a Sui Testnet gRPC endpoint.',
      },
      mainnet: {
        available: Boolean(process.env.MAINNET_TATUM_API_KEY),
        provider: 'Tatum Sui Mainnet gRPC',
        note: process.env.MAINNET_TATUM_API_KEY ? undefined : 'Add MAINNET_TATUM_API_KEY to enable Mainnet reads.',
      },
    },
  }
}

export function createSuiClient(network) {
  let host
  let meta

  if (network === 'mainnet') {
    const apiKey = process.env.MAINNET_TATUM_API_KEY
    if (!apiKey) throw new MissingTatumKeyError(network)
    host = MAINNET_HOST
    meta = { 'x-api-key': apiKey }
  } else {
    host = TESTNET_HOST
    meta = {}
  }

  const transport = new GrpcTransport({
    host,
    channelCredentials: ChannelCredentials.createSsl(),
    meta,
    timeout: 15000,
  })

  return {
    client: new SuiGrpcClient({ network, transport }),
    close: () => transport.close(),
  }
}
