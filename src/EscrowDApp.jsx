import { useState, useCallback } from "react";
import * as FreighterApi from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";

// ── env ──────────────────────────────────────────────────────────────────────
const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID;
const RPC_URL = import.meta.env.VITE_RPC_URL;
const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE;

const XLM_TOKEN = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

// ── explorer ──────────────────────────────────────────────────────────────────
const EXPLORER_BASE = "https://stellar.expert/explorer/testnet";
const CONTRACT_EXPLORER_URL = `${EXPLORER_BASE}/contract/${CONTRACT_ID}`;
const txExplorerUrl = (hash) => `${EXPLORER_BASE}/tx/${hash}`;

// ── helpers ──────────────────────────────────────────────────────────────────
const rpc = new StellarSdk.rpc.Server(RPC_URL);

function fmt(val) {
  return (Number(val) / 1e7).toFixed(2);
}

function shortAddr(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function shortContract(id) {
  if (!id) return "";
  return id.slice(0, 8) + "…" + id.slice(-6);
}

// ── icons ─────────────────────────────────────────────────────────────────────
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const IconLoader = () => (
  <svg className="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
const IconWallet = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
    <circle cx="17" cy="15" r="1" fill="currentColor" />
  </svg>
);
const IconExternal = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);
const IconContract = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

// ── toast ─────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          <span className="toast-dot" />
          <span className="toast-body">{t.msg}</span>
          {t.txHash && (
            <a
              href={txExplorerUrl(t.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="toast-link"
            >
              View tx <IconExternal />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// ── explorer link ─────────────────────────────────────────────────────────────
function ExplorerLink({ href, children, className = "" }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`explorer-link ${className}`}>
      {children}
      <IconExternal />
    </a>
  );
}

// ── main app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("create");
  const [walletPub, setWalletPub] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    id: "", payer: "", receiver: "", token: XLM_TOKEN, amount: "", milestones: "3",
  });
  const [queryId, setQueryId] = useState("");
  const [escrow, setEscrow] = useState(null);
  const [milestoneIdx, setMilestoneIdx] = useState("");
  const [releaseId, setReleaseId] = useState("");
  const [cancelId, setCancelId] = useState("");

  // ── toasts
  const addToast = useCallback((msg, type = "success", txHash = null) => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type, txHash }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 6000);
  }, []);

  // ── wallet connect
  async function connectWallet() {
    try {
      if (FreighterApi && typeof FreighterApi.isConnected === "function") {
        const connected = await FreighterApi.isConnected();
        if (!connected?.isConnected) {
          addToast("Freighter not connected — open the extension and unlock it", "error");
          return;
        }
        await FreighterApi.requestAccess();
        const { address } = await FreighterApi.getAddress();
        if (!address) throw new Error("No address returned");
        setWalletPub(address);
        setForm(f => ({ ...f, payer: address }));
        addToast("Wallet connected");
        return;
      }

      let attempts = 0;
      while (!window.freighter && attempts < 20) {
        await new Promise(r => setTimeout(r, 150));
        attempts++;
      }
      if (!window.freighter) {
        addToast("Freighter not detected — make sure it is unlocked", "error");
        return;
      }
      if (typeof window.freighter.requestAccess === "function") {
        await window.freighter.requestAccess();
      }
      const res = await (window.freighter.getAddress?.() ?? window.freighter.getPublicKey?.());
      const address = res?.address ?? res;
      if (!address) throw new Error("No address returned");
      setWalletPub(address);
      setForm(f => ({ ...f, payer: address }));
      addToast("Wallet connected");
    } catch (e) {
      addToast(e.message || String(e), "error");
    }
  }

  // ── generic invoke helper — now returns { status, hash, explorerUrl }
  async function invoke(op) {
    if (!walletPub) { addToast("Connect wallet first", "error"); return null; }

    setLoading(true);
    try {
      const account = await rpc.getAccount(walletPub);
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(op)
        .setTimeout(30)
        .build();

      const sim = await rpc.simulateTransaction(tx);
      if (StellarSdk.rpc.Api.isSimulationError(sim)) throw new Error(sim.error);

      const assembled = StellarSdk.rpc.assembleTransaction(tx, sim).build();

      let signedTxXdr;
      if (FreighterApi && typeof FreighterApi.signTransaction === "function") {
        const sigResult = await FreighterApi.signTransaction(assembled.toXDR(), {
          networkPassphrase: NETWORK_PASSPHRASE,
          network: "TESTNET",
        });
        signedTxXdr = sigResult?.signedTxXdr ?? sigResult;
      } else {
        const sigResult = await window.freighter.signTransaction(assembled.toXDR(), {
          networkPassphrase: NETWORK_PASSPHRASE,
          network: "TESTNET",
        });
        signedTxXdr = typeof sigResult === "string" ? sigResult : sigResult.signedTxXdr;
      }

      const signed = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
      const result = await rpc.sendTransaction(signed);
      const txHash = result.hash;

      let status = result;
      while (status.status === "PENDING" || status.status === "NOT_FOUND") {
        await new Promise(r => setTimeout(r, 1500));
        status = await rpc.getTransaction(txHash);
      }

      if (status.status === "SUCCESS") {
        addToast("Transaction confirmed", "success", txHash);
        return { status, hash: txHash, explorerUrl: txExplorerUrl(txHash) };
      } else {
        throw new Error("Transaction failed: " + status.status);
      }
    } catch (e) {
      addToast(e.message || String(e), "error");
      return null;
    } finally {
      setLoading(false);
    }
  }

  // ── contract calls
  const contract = new StellarSdk.Contract(CONTRACT_ID);

  async function createEscrow() {
    const { id, payer, receiver, token, amount, milestones } = form;
    if (!id || !payer || !receiver || !token || !amount || !milestones) {
      addToast("Fill all fields", "error"); return;
    }
    const op = contract.call(
      "create_escrow",
      StellarSdk.nativeToScVal(id, { type: "symbol" }),
      new StellarSdk.Address(payer).toScVal(),
      new StellarSdk.Address(receiver).toScVal(),
      new StellarSdk.Address(token).toScVal(),
      StellarSdk.nativeToScVal(BigInt(Math.round(parseFloat(amount) * 1e7)), { type: "i128" }),
      StellarSdk.nativeToScVal(parseInt(milestones), { type: "u32" }),
    );
    await invoke(op);
  }

  async function completeMilestone() {
    if (!queryId || milestoneIdx === "") { addToast("Provide escrow ID & milestone index", "error"); return; }
    const op = contract.call(
      "complete_milestone",
      StellarSdk.nativeToScVal(queryId, { type: "symbol" }),
      StellarSdk.nativeToScVal(parseInt(milestoneIdx), { type: "u32" }),
    );
    await invoke(op);
    await fetchEscrow(queryId);
  }

  async function releaseEscrow() {
    if (!releaseId) { addToast("Provide escrow ID", "error"); return; }
    const op = contract.call(
      "release",
      StellarSdk.nativeToScVal(releaseId, { type: "symbol" }),
    );
    await invoke(op);
  }

  async function cancelEscrow() {
    if (!cancelId) { addToast("Provide escrow ID", "error"); return; }
    const op = contract.call(
      "cancel_escrow",
      StellarSdk.nativeToScVal(cancelId, { type: "symbol" }),
    );
    await invoke(op);
  }

  async function fetchEscrow(id) {
    if (!id) { addToast("Enter escrow ID", "error"); return; }
    setLoading(true);
    try {
      const account = await rpc.getAccount(walletPub || StellarSdk.Keypair.random().publicKey());
      const op = contract.call("get_escrow", StellarSdk.nativeToScVal(id, { type: "symbol" }));
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      }).addOperation(op).setTimeout(30).build();

      const sim = await rpc.simulateTransaction(tx);
      if (StellarSdk.rpc.Api.isSimulationError(sim)) throw new Error(sim.error);

      const retVal = sim.result?.retval;
      if (!retVal) throw new Error("No result");

      const raw = StellarSdk.scValToNative(retVal);
      setEscrow(raw);
      addToast("Escrow loaded");
    } catch (e) {
      addToast(e.message || String(e), "error");
      setEscrow(null);
    } finally {
      setLoading(false);
    }
  }

  const completedCount = escrow?.milestones?.filter(Boolean).length ?? 0;
  const totalCount = escrow?.milestones?.length ?? 0;
  const progressPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #07080b;
          --surface: #0e1016;
          --surface2: #151820;
          --surface3: #1c2030;
          --border: #1f2436;
          --border2: #2a3050;
          --accent: #4f7cff;
          --accent-dim: #4f7cff22;
          --accent2: #9b74f0;
          --green: #2dd4a0;
          --green-dim: #2dd4a015;
          --red: #f06a6a;
          --red-dim: #f06a6a15;
          --amber: #f5a623;
          --text: #dde1ec;
          --text2: #8b92a8;
          --text3: #4e5570;
          --font: 'Syne', sans-serif;
          --mono: 'DM Mono', monospace;
          --r: 10px;
          --r-sm: 6px;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font);
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }

        /* grid bg */
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: .35;
          pointer-events: none;
          z-index: 0;
        }
        body::after {
          content: '';
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse 60% 50% at 50% -10%, #4f7cff18 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .app {
          position: relative;
          z-index: 1;
          max-width: 720px;
          margin: 0 auto;
          padding: 28px 16px 100px;
        }

        /* ── header ── */
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 40px;
          flex-wrap: wrap;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: -.025em;
          margin-right: auto;
        }
        .logo-icon {
          width: 32px; height: 32px;
          background: var(--accent-dim);
          border: 1px solid var(--accent)44;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: var(--accent);
        }
        .logo-text {
          background: linear-gradient(120deg, #fff 30%, var(--accent2));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .logo-net {
          font-size: .65rem;
          font-family: var(--mono);
          font-weight: 400;
          color: var(--amber);
          background: #f5a62318;
          border: 1px solid #f5a62330;
          padding: 2px 7px;
          border-radius: 4px;
          -webkit-text-fill-color: var(--amber);
          margin-left: 2px;
        }

        /* pill buttons (wallet + contract explorer) */
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 999px;
          border: 1px solid var(--border2);
          background: var(--surface);
          cursor: pointer;
          font-family: var(--mono);
          font-size: .75rem;
          color: var(--text2);
          text-decoration: none;
          transition: border-color .18s, color .18s, background .18s;
          white-space: nowrap;
        }
        .pill:hover { border-color: var(--accent); color: var(--text); background: var(--surface2); }
        .pill.connected { border-color: var(--green)66; color: var(--green); }
        .pill.connected:hover { border-color: var(--green); }
        .pill-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--green);
          flex-shrink: 0;
        }

        /* ── contract banner ── */
        .contract-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: var(--r-sm);
          border: 1px solid var(--border2);
          background: var(--surface);
          margin-bottom: 28px;
          font-family: var(--mono);
          font-size: .72rem;
          flex-wrap: wrap;
        }
        .contract-banner-label {
          color: var(--text3);
          font-size: .68rem;
          text-transform: uppercase;
          letter-spacing: .08em;
          flex-shrink: 0;
        }
        .contract-banner-id {
          color: var(--text2);
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ── tabs ── */
        .tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
          margin-bottom: 24px;
          background: var(--surface);
          border-radius: var(--r);
          padding: 4px;
          border: 1px solid var(--border);
        }
        .tab {
          padding: 9px 4px;
          border: none;
          background: transparent;
          color: var(--text3);
          font-family: var(--font);
          font-size: .8rem;
          font-weight: 700;
          border-radius: 7px;
          cursor: pointer;
          transition: all .18s;
          letter-spacing: .01em;
        }
        .tab.active {
          background: var(--surface3);
          color: var(--text);
          border: 1px solid var(--border2);
        }
        .tab:hover:not(.active) { color: var(--text2); }

        /* ── card ── */
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r);
          padding: 24px;
          margin-bottom: 16px;
        }
        .card-title {
          font-size: .9rem;
          font-weight: 700;
          letter-spacing: -.01em;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text);
        }
        .badge {
          font-size: .64rem;
          font-family: var(--mono);
          padding: 2px 7px;
          border-radius: 4px;
          background: var(--accent-dim);
          color: var(--accent);
          border: 1px solid var(--accent)30;
          letter-spacing: .05em;
        }
        .badge-green {
          background: var(--green-dim);
          color: var(--green);
          border-color: var(--green)30;
        }
        .badge-red {
          background: var(--red-dim);
          color: var(--red);
          border-color: var(--red)30;
        }

        /* ── form ── */
        .field { margin-bottom: 14px; }
        .label {
          display: block;
          font-size: .68rem;
          font-weight: 700;
          color: var(--text3);
          margin-bottom: 5px;
          letter-spacing: .07em;
          text-transform: uppercase;
        }
        .input {
          width: 100%;
          padding: 10px 12px;
          border-radius: var(--r-sm);
          border: 1px solid var(--border2);
          background: var(--surface2);
          color: var(--text);
          font-family: var(--mono);
          font-size: .8rem;
          outline: none;
          transition: border-color .18s, background .18s;
        }
        .input:focus { border-color: var(--accent); background: var(--surface3); }
        .input::placeholder { color: var(--text3); }
        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* ── buttons ── */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 11px 20px;
          border-radius: var(--r-sm);
          border: none;
          cursor: pointer;
          font-family: var(--font);
          font-size: .82rem;
          font-weight: 700;
          transition: all .18s;
          letter-spacing: -.01em;
        }
        .btn:disabled { opacity: .35; cursor: not-allowed; }
        .btn-full { width: 100%; margin-top: 6px; }
        .btn-primary { background: var(--accent); color: #fff; }
        .btn-primary:not(:disabled):hover { background: #6b8fff; }
        .btn-secondary {
          background: var(--surface2);
          color: var(--text);
          border: 1px solid var(--border2);
        }
        .btn-secondary:not(:disabled):hover { border-color: var(--accent); }
        .btn-success { background: #0d2e22; color: var(--green); border: 1px solid var(--green)44; }
        .btn-success:not(:disabled):hover { background: #122e23; border-color: var(--green); }
        .btn-danger { background: var(--red-dim); color: var(--red); border: 1px solid var(--red)44; }
        .btn-danger:not(:disabled):hover { border-color: var(--red); }

        /* ── escrow detail ── */
        .escrow-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .escrow-id {
          font-family: var(--mono);
          font-size: .85rem;
          color: var(--text2);
          margin-bottom: 4px;
        }
        .escrow-amount {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -.05em;
          color: var(--text);
          line-height: 1;
        }
        .escrow-amount-unit {
          font-size: .9rem;
          font-weight: 600;
          color: var(--text3);
          margin-left: 4px;
        }

        .meta-grid {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .meta-chip {
          font-family: var(--mono);
          font-size: .7rem;
          background: var(--surface2);
          border: 1px solid var(--border2);
          border-radius: var(--r-sm);
          padding: 5px 9px;
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .meta-key { color: var(--text3); }
        .meta-val { color: var(--text); }

        /* progress */
        .progress-row {
          display: flex;
          justify-content: space-between;
          font-size: .75rem;
          margin-bottom: 7px;
          color: var(--text2);
        }
        .progress-pct { font-weight: 700; color: var(--accent); font-family: var(--mono); }
        .progress-track {
          height: 4px;
          background: var(--surface3);
          border-radius: 99px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent), var(--accent2));
          border-radius: 99px;
          transition: width .5s ease;
        }

        /* milestones */
        .milestones {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
          gap: 7px;
          margin-bottom: 20px;
        }
        .ms {
          aspect-ratio: 1;
          border-radius: var(--r-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: .68rem;
          font-family: var(--mono);
          border: 1px solid var(--border2);
          background: var(--surface2);
          color: var(--text3);
          transition: all .2s;
        }
        .ms.done {
          background: #0a2018;
          border-color: var(--green)55;
          color: var(--green);
        }

        .divider { height: 1px; background: var(--border); margin: 18px 0; }

        .section-label {
          font-size: .65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .1em;
          color: var(--text3);
          margin-bottom: 12px;
        }

        /* ── description text ── */
        .desc {
          font-size: .82rem;
          color: var(--text2);
          line-height: 1.65;
          margin-bottom: 18px;
        }

        /* ── explorer link ── */
        .explorer-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--accent);
          font-family: var(--mono);
          font-size: .72rem;
          text-decoration: none;
          border-bottom: 1px solid var(--accent)33;
          padding-bottom: 1px;
          transition: color .15s, border-color .15s;
        }
        .explorer-link:hover { color: #8fabff; border-color: #8fabff66; }
        .explorer-link svg { flex-shrink: 0; }

        /* ── info row at bottom of forms ── */
        .form-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-top: 14px;
          margin-top: 4px;
          border-top: 1px solid var(--border);
          font-size: .7rem;
          color: var(--text3);
        }
        .form-footer-label { font-family: var(--mono); }

        /* ── toast ── */
        .toast-stack {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 99;
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
        }
        .toast {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 16px;
          border-radius: var(--r-sm);
          font-size: .78rem;
          font-family: var(--mono);
          animation: fadeUp .22s ease;
          max-width: 360px;
          border: 1px solid;
          pointer-events: all;
        }
        .toast--success { background: #0a1e16; border-color: var(--green)55; color: var(--green); }
        .toast--error { background: #1c0e0e; border-color: var(--red)55; color: var(--red); }
        .toast-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: currentColor;
          flex-shrink: 0;
        }
        .toast-body { flex: 1; }
        .toast-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: currentColor;
          text-decoration: none;
          border-bottom: 1px solid currentColor;
          padding-bottom: 1px;
          font-size: .72rem;
          opacity: .85;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .toast-link:hover { opacity: 1; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin .7s linear infinite; }
      `}</style>

      <div className="app">

        {/* ── header ── */}
        <header className="header">
          <div className="logo">
            <div className="logo-icon"><IconShield /></div>
            <span className="logo-text">TrustVault</span>
            <span className="logo-net">TESTNET</span>
          </div>

          <ExplorerLink href={CONTRACT_EXPLORER_URL} className="pill">
            <IconContract />
            Contract
          </ExplorerLink>

          <button
            className={`pill ${walletPub ? "connected" : ""}`}
            onClick={connectWallet}
          >
            {walletPub ? <span className="pill-dot" /> : <IconWallet />}
            {walletPub ? shortAddr(walletPub) : "Connect Wallet"}
          </button>
        </header>

        {/* ── contract banner ── */}
        <div className="contract-banner">
          <span className="contract-banner-label">Contract</span>
          <span className="contract-banner-id" title={CONTRACT_ID}>{CONTRACT_ID}</span>
          <ExplorerLink href={CONTRACT_EXPLORER_URL}>
            stellar.expert
          </ExplorerLink>
        </div>

        {/* ── tabs ── */}
        <nav className="tabs">
          {["create", "manage", "release", "cancel"].map(t => (
            <button
              key={t}
              className={`tab ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>

        {/* ── CREATE ── */}
        {tab === "create" && (
          <div className="card">
            <div className="card-title">
              New Escrow <span className="badge">Soroban</span>
            </div>

            <div className="row">
              <div className="field">
                <label className="label">Escrow ID</label>
                <input className="input" placeholder="deal_001" value={form.id}
                  onChange={e => setForm(f => ({ ...f, id: e.target.value }))} />
              </div>
              <div className="field">
                <label className="label">Milestones</label>
                <input className="input" type="number" min="1" max="20" placeholder="3"
                  value={form.milestones}
                  onChange={e => setForm(f => ({ ...f, milestones: e.target.value }))} />
              </div>
            </div>

            <div className="field">
              <label className="label">Payer Address</label>
              <input className="input" placeholder="G…" value={form.payer}
                onChange={e => setForm(f => ({ ...f, payer: e.target.value }))} />
            </div>

            <div className="field">
              <label className="label">Receiver Address</label>
              <input className="input" placeholder="G…" value={form.receiver}
                onChange={e => setForm(f => ({ ...f, receiver: e.target.value }))} />
            </div>

            <div className="field">
              <label className="label">Amount (XLM)</label>
              <input className="input" type="number" placeholder="100" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>

            <button
              className="btn btn-primary btn-full"
              onClick={createEscrow}
              disabled={loading || !walletPub}
            >
              {loading ? <IconLoader /> : <IconArrow />}
              {loading ? "Processing…" : "Create Escrow"}
            </button>

            <div className="form-footer">
              <span className="form-footer-label">Contract:</span>
              <ExplorerLink href={CONTRACT_EXPLORER_URL}>
                {shortContract(CONTRACT_ID)}
              </ExplorerLink>
            </div>
          </div>
        )}

        {/* ── MANAGE ── */}
        {tab === "manage" && (
          <>
            <div className="card">
              <div className="card-title">Look Up Escrow</div>
              <div className="row">
                <div className="field">
                  <label className="label">Escrow ID</label>
                  <input className="input" placeholder="deal_001" value={queryId}
                    onChange={e => setQueryId(e.target.value)} />
                </div>
                <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    className="btn btn-secondary btn-full"
                    style={{ marginTop: 0 }}
                    onClick={() => fetchEscrow(queryId)}
                    disabled={loading}
                  >
                    {loading ? <IconLoader /> : "Fetch"}
                  </button>
                </div>
              </div>
              <div className="form-footer">
                <span className="form-footer-label">Contract:</span>
                <ExplorerLink href={CONTRACT_EXPLORER_URL}>
                  {shortContract(CONTRACT_ID)}
                </ExplorerLink>
              </div>
            </div>

            {escrow && (
              <div className="card">
                <div className="escrow-top">
                  <div>
                    <div className="escrow-id">{queryId}</div>
                    <div className="escrow-amount">
                      {fmt(escrow.total_amount)}
                      <span className="escrow-amount-unit">XLM</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                    <span className={`badge ${completedCount === totalCount ? "badge-green" : ""}`}>
                      {completedCount === totalCount ? "Complete" : "Active"}
                    </span>
                    <ExplorerLink href={`${EXPLORER_BASE}/account/${escrow.payer?.toString()}`}>
                      View payer
                    </ExplorerLink>
                  </div>
                </div>

                <div className="meta-grid">
                  <div className="meta-chip">
                    <span className="meta-key">Payer</span>
                    <span className="meta-val">{shortAddr(escrow.payer?.toString())}</span>
                  </div>
                  <div className="meta-chip">
                    <span className="meta-key">Receiver</span>
                    <span className="meta-val">{shortAddr(escrow.receiver?.toString())}</span>
                  </div>
                  <div className="meta-chip">
                    <span className="meta-key">Released</span>
                    <span className="meta-val" style={{ color: "var(--green)" }}>
                      {fmt(escrow.released)} XLM
                    </span>
                  </div>
                  <div className="meta-chip">
                    <span className="meta-key">Remaining</span>
                    <span className="meta-val">
                      {fmt(escrow.total_amount - escrow.released)} XLM
                    </span>
                  </div>
                </div>

                <div className="progress-row">
                  <span>Milestone progress</span>
                  <span className="progress-pct">{completedCount}/{totalCount} — {progressPct}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: progressPct + "%" }} />
                </div>

                <div className="section-label">Milestones</div>
                <div className="milestones">
                  {escrow.milestones?.map((done, i) => (
                    <div key={i} className={`ms ${done ? "done" : ""}`} title={`Milestone ${i + 1}`}>
                      {done ? <IconCheck /> : <span>{i + 1}</span>}
                    </div>
                  ))}
                </div>

                <div className="divider" />

                <div className="section-label">Mark milestone complete (payer only)</div>
                <div className="row">
                  <div className="field">
                    <label className="label">Milestone index (0-based)</label>
                    <input className="input" type="number" min="0" placeholder="0"
                      value={milestoneIdx}
                      onChange={e => setMilestoneIdx(e.target.value)} />
                  </div>
                  <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
                    <button
                      className="btn btn-success btn-full"
                      style={{ marginTop: 0 }}
                      onClick={completeMilestone}
                      disabled={loading || !walletPub}
                    >
                      {loading ? <IconLoader /> : <IconCheck />}
                      Complete
                    </button>
                  </div>
                </div>

                <div className="form-footer">
                  <span className="form-footer-label">Tx history:</span>
                  <ExplorerLink href={`${EXPLORER_BASE}/contract/${CONTRACT_ID}?filter=operations`}>
                    stellar.expert
                  </ExplorerLink>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── RELEASE ── */}
        {tab === "release" && (
          <div className="card">
            <div className="card-title">
              Release Funds <span className="badge badge-green">Receiver</span>
            </div>
            <p className="desc">
              Releases proportional funds to the receiver based on completed milestones.
              Only the receiver can trigger this action.
            </p>
            <div className="field">
              <label className="label">Escrow ID</label>
              <input className="input" placeholder="deal_001" value={releaseId}
                onChange={e => setReleaseId(e.target.value)} />
            </div>
            <button
              className="btn btn-success btn-full"
              onClick={releaseEscrow}
              disabled={loading || !walletPub}
            >
              {loading ? <IconLoader /> : <IconArrow />}
              {loading ? "Processing…" : "Release Funds"}
            </button>
            <div className="form-footer">
              <span className="form-footer-label">Contract:</span>
              <ExplorerLink href={CONTRACT_EXPLORER_URL}>
                {shortContract(CONTRACT_ID)}
              </ExplorerLink>
            </div>
          </div>
        )}

        {/* ── CANCEL ── */}
        {tab === "cancel" && (
          <div className="card">
            <div className="card-title">
              Cancel Escrow <span className="badge badge-red">Payer</span>
            </div>
            <p className="desc">
              Cancels the escrow and refunds all remaining tokens to the payer.
              Only the original payer can cancel an active escrow.
            </p>
            <div className="field">
              <label className="label">Escrow ID</label>
              <input className="input" placeholder="deal_001" value={cancelId}
                onChange={e => setCancelId(e.target.value)} />
            </div>
            <button
              className="btn btn-danger btn-full"
              onClick={cancelEscrow}
              disabled={loading || !walletPub}
            >
              {loading ? <IconLoader /> : <IconX />}
              {loading ? "Processing…" : "Cancel & Refund"}
            </button>
            <div className="form-footer">
              <span className="form-footer-label">Contract:</span>
              <ExplorerLink href={CONTRACT_EXPLORER_URL}>
                {shortContract(CONTRACT_ID)}
              </ExplorerLink>
            </div>
          </div>
        )}

      </div>

      <Toast toasts={toasts} />
    </>
  );
}