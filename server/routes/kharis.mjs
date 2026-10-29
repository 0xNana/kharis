import { Router } from 'express'
import { tatumApiBase, tatumFetch, tatumRpc, MissingApiKeyError } from '../tatum-client.mjs'

const router = Router()

// In-memory state for Kharis Vault (since filesystem is read-only)
// Maintains switch configurations, simulated/stored heartbeat records, webhook alerts and beneficiaries
let vaultState = {
  vaultAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  network: 'base-mainnet',
  lastHeartbeatTimestamp: Date.now() - 1000 * 60 * 60 * 24 * 14, // 14 days ago by default
  inactivityDays: 90,
  gracePeriodDays: 14,
  beneficiaries: [
    {
      id: 'b1',
      address: '0x1234567890123456789012345678901234567890',
      label: 'Primary Heir (Spouse)',
      sharePercent: 60,
      status: 'Pending',
    },
    {
      id: 'b2',
      address: '0x2345678901234567890123456789012345678901',
      label: 'College Trust (Child A)',
      sharePercent: 20,
      status: 'Pending',
    },
    {
      id: 'b3',
      address: '0x3456789012345678901234567890123456789012',
      label: 'Backup Guardian (Sibling)',
      sharePercent: 20,
      status: 'Pending',
    },
  ],
  activities: [
    {
      id: 'act-init-1',
      type: 'ping',
      title: 'Heartbeat Verified',
      detail: 'Proof-of-life signal recorded on Base L2',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
      txHash: '0x8f2a64c51e4b99824bc102',
    },
    {
      id: 'act-init-2',
      type: 'deposit',
      title: 'Initial Vault Funding',
      detail: '+25,000.00 USDC transferred to Kharis Vault',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      txHash: '0x5c317aa02b74088921bf34',
    },
  ],
  webhookAlertId: null,
}

// Health check
router.get('/status', async (_req, res) => {
  if (!process.env.TATUM_API_KEY) return res.json({ status: 'no-api-key' })
  try {
    await fetch(tatumApiBase(), { signal: AbortSignal.timeout(8000) })
    res.json({ status: 'connected' })
  } catch (error) {
    res.json({ status: 'egress-failed', error: error.message })
  }
})

// Get Vault Overview (fetches live on-chain balances from Base if API key available)
router.get('/vault', async (_req, res) => {
  let liveUsdcBalance = 25000;
  let nativeEthBalance = 0.045;
  let hasLiveChainData = false;
  let chainError = null;

  try {
    if (process.env.TATUM_API_KEY) {
      // 1. Check live USDC token portfolio for vault address on Base
      const portfolioUrl = `/v4/data/wallet/portfolio?chain=base-mainnet&addresses=${vaultState.vaultAddress}&tokenTypes=fungible`;
      const response = await tatumFetch(portfolioUrl);
      if (response && response.result && Array.isArray(response.result)) {
        const usdcItem = response.result.find(
          (t) => t.tokenAddress?.toLowerCase() === vaultState.usdcAddress.toLowerCase()
        );
        if (usdcItem) {
          liveUsdcBalance = parseFloat(usdcItem.denominatedBalance || usdcItem.balance || '0');
        }
        hasLiveChainData = true;
      }

      // 2. Also check native balance for gas buffer
      const nativeUrl = `/v4/data/wallet/portfolio?chain=base-mainnet&addresses=${vaultState.vaultAddress}&tokenTypes=native`;
      const nativeRes = await tatumFetch(nativeUrl);
      if (nativeRes && nativeRes.result && nativeRes.result[0]) {
        nativeEthBalance = parseFloat(nativeRes.result[0].denominatedBalance || nativeRes.result[0].balance || '0');
      }
    }
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      chainError = 'MissingApiKeyError: No Tatum API key in environment';
    } else {
      chainError = err.message;
    }
  }

  // Calculate Switch Timers
  const now = Date.now();
  const msElapsed = now - vaultState.lastHeartbeatTimestamp;
  const daysSinceHeartbeat = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
  const daysUntilGrace = vaultState.inactivityDays - daysSinceHeartbeat;
  const daysUntilExecution = (vaultState.inactivityDays + vaultState.gracePeriodDays) - daysSinceHeartbeat;

  let switchStatus = 'ACTIVE';
  if (daysSinceHeartbeat >= vaultState.inactivityDays + vaultState.gracePeriodDays) {
    switchStatus = 'TRIGGERED';
  } else if (daysSinceHeartbeat >= vaultState.inactivityDays) {
    switchStatus = 'GRACE_PERIOD';
  } else if (daysUntilGrace <= 14) {
    switchStatus = 'WARNING';
  }

  // Update heir statuses
  const beneficiariesWithAmounts = vaultState.beneficiaries.map((b) => ({
    ...b,
    allocatedAmountUsdc: (liveUsdcBalance * b.sharePercent) / 100,
    status: switchStatus === 'TRIGGERED' ? 'Eligible' : 'Pending',
  }));

  res.json({
    vaultAddress: vaultState.vaultAddress,
    usdcAddress: vaultState.usdcAddress,
    network: vaultState.network,
    usdcBalance: liveUsdcBalance,
    nativeEthBalance,
    hasLiveChainData,
    chainError,
    lastHeartbeat: new Date(vaultState.lastHeartbeatTimestamp).toISOString(),
    daysSinceHeartbeat,
    inactivityDays: vaultState.inactivityDays,
    gracePeriodDays: vaultState.gracePeriodDays,
    daysUntilGrace: Math.max(0, daysUntilGrace),
    daysUntilExecution: Math.max(0, daysUntilExecution),
    switchStatus,
    beneficiaries: beneficiariesWithAmounts,
    activities: vaultState.activities,
    webhookAlertId: vaultState.webhookAlertId,
  });
});

// Send Heartbeat (Ping check-in)
router.post('/ping', async (req, res) => {
  vaultState.lastHeartbeatTimestamp = Date.now();

  const newActivity = {
    id: `ping-${Date.now()}`,
    type: 'ping',
    title: 'Heartbeat Verified',
    detail: 'Proof-of-life ping received. Vault timer reset to zero.',
    timestamp: new Date().toISOString(),
    txHash: '0x' + Math.random().toString(16).substring(2, 10) + '...',
  };

  vaultState.activities.unshift(newActivity);
  res.json({ success: true, activity: newActivity, lastHeartbeat: new Date(vaultState.lastHeartbeatTimestamp).toISOString() });
});

// Update Configuration (inactivity days & grace period)
router.post('/settings', (req, res) => {
  const { inactivityDays, gracePeriodDays } = req.body;
  if (inactivityDays && Number(inactivityDays) > 0) {
    vaultState.inactivityDays = Number(inactivityDays);
  }
  if (gracePeriodDays && Number(gracePeriodDays) >= 0) {
    vaultState.gracePeriodDays = Number(gracePeriodDays);
  }

  const newActivity = {
    id: `config-${Date.now()}`,
    type: 'beneficiary_update',
    title: 'Parameters Updated',
    detail: `Cadence set to ${vaultState.inactivityDays}d, Grace period ${vaultState.gracePeriodDays}d`,
    timestamp: new Date().toISOString(),
  };
  vaultState.activities.unshift(newActivity);

  res.json({ success: true, inactivityDays: vaultState.inactivityDays, gracePeriodDays: vaultState.gracePeriodDays });
});

// Add Beneficiary
router.post('/beneficiaries', (req, res) => {
  const { label, address, sharePercent } = req.body;
  if (!label || !address || !sharePercent) {
    return res.status(400).json({ error: 'Missing label, address, or sharePercent' });
  }

  const newBen = {
    id: `b-${Date.now()}`,
    label,
    address,
    sharePercent: Number(sharePercent),
    status: 'Pending',
  };

  vaultState.beneficiaries.push(newBen);

  const newActivity = {
    id: `add-ben-${Date.now()}`,
    type: 'beneficiary_update',
    title: 'Heir Registered',
    detail: `Added ${label} (${sharePercent}%) to inheritance distribution`,
    timestamp: new Date().toISOString(),
  };
  vaultState.activities.unshift(newActivity);

  res.json({ success: true, beneficiaries: vaultState.beneficiaries });
});

// Remove Beneficiary
router.delete('/beneficiaries/:id', (req, res) => {
  const { id } = req.params;
  vaultState.beneficiaries = vaultState.beneficiaries.filter((b) => b.id !== id);
  res.json({ success: true, beneficiaries: vaultState.beneficiaries });
});

// Simulation route: Force age or Reset
router.post('/simulate', (req, res) => {
  const { action } = req.body; // 'trigger', 'warning', 'reset'

  if (action === 'trigger') {
    // Fast-forward beyond inactivity + grace period
    const totalDays = vaultState.inactivityDays + vaultState.gracePeriodDays + 2;
    vaultState.lastHeartbeatTimestamp = Date.now() - 1000 * 60 * 60 * 24 * totalDays;
  } else if (action === 'warning') {
    // Fast-forward into warning window
    vaultState.lastHeartbeatTimestamp = Date.now() - 1000 * 60 * 60 * 24 * (vaultState.inactivityDays - 3);
  } else {
    // Reset to now
    vaultState.lastHeartbeatTimestamp = Date.now();
  }

  res.json({ success: true, lastHeartbeatTimestamp: vaultState.lastHeartbeatTimestamp });
});

// Register Webhook / Notification for Vault monitoring via Tatum
router.post('/notifications/subscribe', async (req, res) => {
  if (!process.env.TATUM_API_KEY) {
    return res.status(400).json({ error: 'TATUM_API_KEY is not configured in this workspace' });
  }

  try {
    const webhookUrl = req.body.webhookUrl || 'https://dashboard.tatum.io/webhook-handler';
    const subBody = {
      type: 'ADDRESS_EVENT',
      attr: {
        chain: 'base-mainnet',
        address: vaultState.vaultAddress,
        url: webhookUrl,
      },
      templateId: 'enriched',
    };

    const subResult = await tatumFetch('/v4/subscription', {
      method: 'POST',
      body: JSON.stringify(subBody),
    });

    if (subResult && subResult.id) {
      vaultState.webhookAlertId = subResult.id;
    }

    res.json({ success: true, subscription: subResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook receiver endpoint for incoming Base on-chain alerts
router.post('/webhook', (req, res) => {
  const payload = req.body;
  if (payload && payload.data) {
    const tx = payload.data;
    const isIncoming = tx.to?.toLowerCase() === vaultState.vaultAddress.toLowerCase();
    vaultState.activities.unshift({
      id: `wh-${Date.now()}`,
      type: isIncoming ? 'deposit' : 'ping',
      title: isIncoming ? 'On-Chain Inflow Detected' : 'Vault Interaction Observed',
      detail: `${tx.currency || 'Token'} transfer recorded from ${tx.from?.substring(0, 8)}...`,
      timestamp: new Date().toISOString(),
      txHash: tx.txId,
    });
  }
  res.json({ received: true });
});

export default router
