import * as StellarSdk from '@stellar/stellar-sdk'

const CONTRACT_ID        = import.meta.env.VITE_CONTRACT_ID
const RPC_URL            = import.meta.env.VITE_RPC_URL
const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE

export const XLM_TOKEN        = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCN3'
const SIMULATION_FALLBACK     = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'

const server   = new StellarSdk.rpc.Server(RPC_URL)
const contract = new StellarSdk.Contract(CONTRACT_ID)

// ─── ScVal helpers ─────────────────────────────────────────────────────────
const sym  = (s) => StellarSdk.nativeToScVal(String(s), { type: 'symbol'  })
const addr = (a) => {
  if (a.startsWith('C')) {
    // Contract address — decode and wrap manually
    const bytes = StellarSdk.StrKey.decodeContract(a)
    return StellarSdk.xdr.ScVal.scvAddress(
      StellarSdk.xdr.ScAddress.scAddressTypeContract(
        StellarSdk.xdr.Hash.fromXDR(bytes)
      )
    )
  }
  // Account address
  return StellarSdk.xdr.ScVal.scvAddress(
    StellarSdk.xdr.ScAddress.scAddressTypeAccount(
      StellarSdk.xdr.AccountID.publicKeyTypeEd25519(
        StellarSdk.StrKey.decodeEd25519PublicKey(a)
      )
    )
  )
}
const u32  = (n) => StellarSdk.nativeToScVal(Number(n), { type: 'u32'     })
const i128 = (n) => StellarSdk.nativeToScVal(BigInt(n), { type: 'i128'    })

// ─── Build → sign → submit ─────────────────────────────────────────────────
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
  const response  = await server.sendTransaction(signedTx)
  return waitForConfirmation(response.hash)
}

// ─── Poll until confirmed ──────────────────────────────────────────────────
async function waitForConfirmation(hash) {
  for (let i = 0; i < 20; i++) {
    const status = await server.getTransaction(hash)
    if (status.status === 'SUCCESS') return { ...status, hash }
    if (status.status === 'FAILED')  throw new Error(`Transaction failed: ${hash}`)
    await new Promise((r) => setTimeout(r, 1500))
  }
  throw new Error('Transaction confirmation timeout')
}

// ─── Create escrow ─────────────────────────────────────────────────────────
export async function createEscrow({
  id,
  payer,
  receiver,
  token = XLM_TOKEN,       // defaults to native XLM
  total_amount,
  milestone_count,
  signTransaction,
}) {
  if (!id?.trim())             throw new Error('Escrow ID must be a non-empty string')
  if (!payer || !receiver)     throw new Error('Payer and receiver addresses are required')
  if (!(total_amount > 0))     throw new Error('Total amount must be greater than 0')
  if (!(milestone_count > 0))  throw new Error('Milestone count must be greater than 0')

  const account = await server.getAccount(payer)
  return buildAndSend(
    account,
    contract.call(
      'create_escrow',
      sym(id.trim()),
      addr(payer),
      addr(receiver),
      addr(token),           // token comes 4th — matches lib.rs
      i128(total_amount),
      u32(milestone_count),
    ),
    signTransaction,
  )
}

// ─── Complete milestone ────────────────────────────────────────────────────
export async function completeMilestone({ id, index, payerAddress, signTransaction }) {
  if (!id?.trim())                    throw new Error('Escrow ID must be a non-empty string')
  if (index === undefined || index < 0) throw new Error('Valid milestone index is required')

  const account = await server.getAccount(payerAddress)
  return buildAndSend(
    account,
    contract.call('complete_milestone', sym(id), u32(index)),
    signTransaction,
  )
}

// ─── Release funds ─────────────────────────────────────────────────────────
export async function releaseEscrow({ id, receiverAddress, signTransaction }) {
  if (!id?.trim()) throw new Error('Escrow ID must be a non-empty string')

  const account = await server.getAccount(receiverAddress)
  return buildAndSend(
    account,
    contract.call('release', sym(id)),
    signTransaction,
  )
}

// ─── Cancel escrow ─────────────────────────────────────────────────────────
export async function cancelEscrow({ id, payerAddress, signTransaction }) {
  if (!id?.trim()) throw new Error('Escrow ID must be a non-empty string')

  const account = await server.getAccount(payerAddress)
  return buildAndSend(
    account,
    contract.call('cancel_escrow', sym(id)),
    signTransaction,
  )
}

// ─── Read escrow (simulation — no wallet needed) ───────────────────────────
export async function getEscrow(id, userAddress) {
  if (!id?.trim()) throw new Error('Escrow ID must be a non-empty string')

  try {
    const source  = userAddress ?? SIMULATION_FALLBACK
    const account = await server.getAccount(source)

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_escrow', sym(id)))
      .setTimeout(30)
      .build()

    const result = await server.simulateTransaction(tx)
    if (result.error)   throw new Error(result.error)
    if (!result.result) throw new Error('Escrow not found')

    const n = StellarSdk.scValToNative(result.result.retval)
    const milestones = Array.from(n.milestones).map((m) =>
      typeof m === 'boolean' ? m : Boolean(m),
    )

    return {
      payer:           n.payer?.toString()    ?? String(n.payer),
      receiver:        n.receiver?.toString() ?? String(n.receiver),
      token:           n.token?.toString()    ?? String(n.token),
      total_amount:    Number(n.total_amount),
      released:        Number(n.released),
      milestones,
      completed_count: milestones.filter(Boolean).length,
      total_count:     milestones.length,
      is_complete:     milestones.every(Boolean),
      remaining:       Number(n.total_amount) - Number(n.released),
    }
  } catch (e) {
    console.error('getEscrow error:', e)
    throw new Error(e.message || 'Escrow not found')
  }
}