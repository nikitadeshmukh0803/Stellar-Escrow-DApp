import * as StellarSdk from '@stellar/stellar-sdk'

const CONTRACT_ID        = import.meta.env.VITE_CONTRACT_ID
const RPC_URL            = import.meta.env.VITE_RPC_URL
const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE

// Fallback funded testnet account used for read-only simulations
// when no wallet is connected. simulateTransaction never submits,
// so any valid funded account works here.
const SIMULATION_FALLBACK = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'

const server   = new StellarSdk.rpc.Server(RPC_URL)
const contract = new StellarSdk.Contract(CONTRACT_ID)

// ─── ScVal helpers ────────────────────────────────────────────────────────
const sym  = (s) => StellarSdk.nativeToScVal(String(s), { type: 'symbol' })
const addr = (a) => StellarSdk.Address.fromString(a).toScVal()
const u32  = (n) => StellarSdk.nativeToScVal(Number(n),  { type: 'u32'  })
const i128 = (n) => StellarSdk.nativeToScVal(BigInt(n),  { type: 'i128' })

// ─── Build, sign, submit ───────────────────────────────────────────────────
async function buildAndSend(account, operation, signTransaction) {
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build()

  const prepared  = await server.prepareTransaction(tx)
  const signedXdr = await signTransaction(prepared.toXDR())
  const signedTx  = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  return server.sendTransaction(signedTx)
}

// ─── Create escrow ─────────────────────────────────────────────────────────
export async function createEscrow({
  id,
  payer,
  receiver,
  total_amount,
  milestone_count,
  signTransaction,
}) {
  if (!id || typeof id !== 'string') throw new Error('Escrow ID must be a non-empty string')
  const account = await server.getAccount(payer)
  return buildAndSend(
    account,
    contract.call(
      'create_escrow',
      sym(id),
      addr(payer),
      addr(receiver),
      i128(total_amount),
      u32(milestone_count),
    ),
    signTransaction,
  )
}

// ─── Complete a milestone ──────────────────────────────────────────────────
export async function completeMilestone({ id, index, payerAddress, signTransaction }) {
  if (!id || typeof id !== 'string') throw new Error('Escrow ID must be a non-empty string')
  const account = await server.getAccount(payerAddress)
  return buildAndSend(
    account,
    contract.call('complete_milestone', sym(id), u32(index)),
    signTransaction,
  )
}

// ─── Release funds ─────────────────────────────────────────────────────────
export async function releaseEscrow({ id, receiverAddress, signTransaction }) {
  if (!id || typeof id !== 'string') throw new Error('Escrow ID must be a non-empty string')
  const account = await server.getAccount(receiverAddress)
  return buildAndSend(
    account,
    contract.call('release', sym(id)),
    signTransaction,
  )
}

// ─── Read escrow (simulation only — no wallet required) ────────────────────
//
//  FIX: userAddress is now optional.  When omitted we fall back to a known
//  funded testnet account so the lookup works even before the wallet is
//  connected.  simulateTransaction never submits to the ledger, so this is
//  completely safe.
//
export async function getEscrow(id, userAddress) {
  if (!id || typeof id !== 'string') throw new Error('Escrow ID must be a non-empty string')

  try {
    const sourceAddress = userAddress ?? SIMULATION_FALLBACK
    const account = await server.getAccount(sourceAddress)

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_escrow', sym(id)))
      .setTimeout(30)
      .build()

    const result = await server.simulateTransaction(tx)
    console.log('simulateTransaction result:', JSON.stringify(result, null, 2))

    if (result.error) throw new Error(result.error)
    if (!result.result) throw new Error('Escrow not found')

    const native = StellarSdk.scValToNative(result.result.retval)
    console.log('native escrow:', native)

    return {
      payer:        native.payer?.toString()    ?? String(native.payer),
      receiver:     native.receiver?.toString() ?? String(native.receiver),
      total_amount: Number(native.total_amount),
      released:     Number(native.released),
      milestones:   Array.from(native.milestones).map((m) =>
        typeof m === 'boolean' ? m : Boolean(m),
      ),
    }
  } catch (e) {
    console.error('getEscrow error:', e)
    throw new Error(e.message || 'Escrow not found')
  }
}