import { useState, useEffect, useCallback } from "react";
import * as freighterApi from "@stellar/freighter-api";
import { createEscrow, completeMilestone, releaseEscrow, getEscrow } from "./contract/escrow";

const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const EXPLORER_BASE      = "https://stellar.expert/explorer/testnet/tx";
const CONTRACT_ID        = import.meta.env.VITE_CONTRACT_ID;
const CONTRACT_EXPLORER  = `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`;

const sign = async (xdr) => {
  const result = await freighterApi.signTransaction(xdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  if (result.error) throw new Error(result.error);
  return result.signedTxXdr;
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #0a0b0f;
    --surface:   #10121a;
    --border:    #1e2235;
    --accent:    #5cffc2;
    --accent2:   #ff6b6b;
    --accent3:   #ffd166;
    --text:      #e8eaf0;
    --muted:     #5a5f78;
    --radius:    12px;
    --mono:      'DM Mono', monospace;
    --sans:      'Syne', sans-serif;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--sans);
    min-height: 100vh;
    line-height: 1.6;
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

  .app {
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 20px 80px;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 48px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }
  .logo { display: flex; align-items: center; gap: 12px; }
  .logo-icon {
    width: 40px; height: 40px;
    background: var(--accent);
    border-radius: 10px;
    display: grid; place-items: center;
    font-size: 20px;
  }
  .logo-text { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
  .logo-sub  { font-size: 11px; color: var(--muted); font-family: var(--mono); text-transform: uppercase; letter-spacing: 2px; }

  /* ── Contract explorer pill ── */
  .contract-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 5px;
    font-size: 10px;
    font-family: var(--mono);
    color: var(--accent);
    text-decoration: none;
    padding: 3px 8px;
    border-radius: 99px;
    border: 1px solid rgba(92,255,194,.2);
    background: rgba(92,255,194,.07);
    transition: background .15s, border-color .15s;
    letter-spacing: .3px;
  }
  .contract-link:hover {
    background: rgba(92,255,194,.15);
    border-color: rgba(92,255,194,.45);
  }
  .contract-link-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 4px var(--accent);
    flex-shrink: 0;
  }

  .wallet-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 18px;
    border-radius: 99px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-family: var(--mono);
    font-size: 13px;
    cursor: pointer;
    transition: border-color .2s, color .2s;
  }
  .wallet-btn:hover { border-color: var(--accent); color: var(--accent); }
  .wallet-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--muted);
    transition: background .2s;
  }
  .wallet-dot.connected { background: var(--accent); box-shadow: 0 0 6px var(--accent); }

  /* ── Tabs ── */
  .tabs {
    display: flex; gap: 4px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 99px;
    padding: 4px;
    width: fit-content;
    margin-bottom: 36px;
  }
  .tab {
    padding: 8px 22px;
    border-radius: 99px;
    border: none;
    background: transparent;
    color: var(--muted);
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background .2s, color .2s;
  }
  .tab.active { background: var(--accent); color: #000; }

  /* ── Card ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 28px;
    margin-bottom: 24px;
    animation: fadeUp .3s ease both;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .card-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 20px;
    display: flex; align-items: center; gap: 8px;
  }
  .card-title::before {
    content: '';
    display: block;
    width: 3px; height: 14px;
    background: var(--accent);
    border-radius: 2px;
  }

  /* ── Form ── */
  .field { margin-bottom: 18px; }
  .label {
    display: block;
    font-size: 12px;
    font-family: var(--mono);
    color: var(--muted);
    margin-bottom: 6px;
    letter-spacing: .5px;
  }
  .input {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 11px 14px;
    color: var(--text);
    font-family: var(--mono);
    font-size: 13px;
    outline: none;
    transition: border-color .2s;
  }
  .input:focus { border-color: var(--accent); }
  .input::placeholder { color: var(--muted); }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 24px;
    border-radius: 8px;
    border: none;
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity .15s, transform .1s;
    text-decoration: none;
  }
  .btn:active { transform: scale(.98); }
  .btn:disabled { opacity: .4; cursor: not-allowed; }
  .btn-primary   { background: var(--accent); color: #000; }
  .btn-secondary { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
  .btn-ghost     { background: transparent; color: var(--accent); border: 1px solid rgba(92,255,194,.25); }
  .btn-sm { padding: 7px 14px; font-size: 12px; border-radius: 6px; }
  .btn-full { width: 100%; justify-content: center; }
  .spin {
    width: 14px; height: 14px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin .6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Escrow card ── */
  .escrow-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    margin-bottom: 16px;
    animation: fadeUp .3s ease both;
    transition: border-color .2s;
  }
  .escrow-card:hover { border-color: #2c314a; }
  .escrow-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 22px;
    cursor: pointer;
    user-select: none;
  }
  .escrow-id {
    font-family: var(--mono);
    font-size: 15px;
    font-weight: 500;
    display: flex; align-items: center; gap: 10px;
    flex-wrap: wrap;
  }
  .escrow-badge {
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 99px;
    font-family: var(--mono);
    font-weight: 500;
    background: rgba(92,255,194,.12);
    color: var(--accent);
  }
  .chevron { color: var(--muted); transition: transform .2s; font-size: 12px; }
  .chevron.open { transform: rotate(180deg); }

  .escrow-body {
    padding: 18px 22px 22px;
    border-top: 1px solid var(--border);
  }
  .meta-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 12px 24px;
    margin-bottom: 20px;
  }
  .meta-key { font-size: 11px; font-family: var(--mono); color: var(--muted); margin-bottom: 3px; }
  .meta-val { font-size: 13px; font-family: var(--mono); word-break: break-all; }
  .meta-val.accent { color: var(--accent); }

  .progress-wrap { margin-bottom: 20px; }
  .progress-label {
    display: flex; justify-content: space-between;
    font-size: 12px; font-family: var(--mono); color: var(--muted);
    margin-bottom: 8px;
  }
  .progress-track { height: 6px; background: var(--bg); border-radius: 99px; overflow: hidden; }
  .progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 99px;
    transition: width .5s cubic-bezier(.4,0,.2,1);
  }

  .milestones { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
  .milestone-row {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 14px;
    background: var(--bg);
    border-radius: 8px;
    border: 1px solid var(--border);
  }
  .ms-check {
    width: 20px; height: 20px;
    border-radius: 50%;
    border: 2px solid var(--border);
    flex-shrink: 0;
    display: grid; place-items: center;
    font-size: 10px;
    transition: border-color .2s, background .2s;
  }
  .ms-check.done { border-color: var(--accent); background: var(--accent); color: #000; }
  .ms-label { flex: 1; font-size: 13px; font-family: var(--mono); }
  .ms-status { font-size: 11px; color: var(--muted); font-family: var(--mono); }
  .ms-status.done { color: var(--accent); }
  .escrow-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }

  .released-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px;
    background: rgba(92,255,194,.06);
    border: 1px solid rgba(92,255,194,.2);
    border-radius: 8px;
    margin-bottom: 18px;
  }
  .released-label { font-size: 12px; font-family: var(--mono); color: var(--muted); }
  .released-val { font-size: 15px; font-weight: 700; color: var(--accent); font-family: var(--mono); }

  /* ── Tx history strip ── */
  .tx-history {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .tx-history-title {
    font-size: 10px;
    font-family: var(--mono);
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 4px;
  }
  .tx-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-family: var(--mono);
    font-size: 12px;
    animation: fadeUp .2s ease both;
  }
  .tx-dot {
    width: 7px; height: 7px; border-radius: 50%;
    flex-shrink: 0;
  }
  .tx-dot.milestone { background: var(--accent3); box-shadow: 0 0 5px var(--accent3); }
  .tx-dot.release   { background: var(--accent);  box-shadow: 0 0 5px var(--accent); }
  .tx-dot.create    { background: var(--accent2);  box-shadow: 0 0 5px var(--accent2); }
  .tx-label { flex: 1; color: var(--text); }
  .tx-hash-link {
    display: inline-flex; align-items: center; gap: 4px;
    color: var(--accent);
    text-decoration: none;
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 5px;
    border: 1px solid rgba(92,255,194,.2);
    background: rgba(92,255,194,.06);
    transition: background .15s, border-color .15s;
    white-space: nowrap;
  }
  .tx-hash-link:hover { background: rgba(92,255,194,.14); border-color: rgba(92,255,194,.45); }
  .tx-time { font-size: 10px; color: var(--muted); white-space: nowrap; }

  /* ── Toast ── */
  .toast-wrap {
    position: fixed; bottom: 32px; right: 32px;
    display: flex; flex-direction: column; gap: 10px;
    z-index: 9999;
  }
  .toast {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px 18px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    min-width: 300px; max-width: 400px;
    box-shadow: 0 8px 32px rgba(0,0,0,.4);
    animation: slideIn .25s ease both;
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .toast-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
  .toast-title { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
  .toast-msg { font-size: 12px; color: var(--muted); font-family: var(--mono); line-height: 1.4; }
  .toast-hash-link {
    display: inline-flex; align-items: center; gap: 4px;
    margin-top: 7px;
    font-size: 11px;
    font-family: var(--mono);
    color: var(--accent);
    text-decoration: none;
    padding: 4px 9px;
    border-radius: 5px;
    border: 1px solid rgba(92,255,194,.25);
    background: rgba(92,255,194,.07);
    transition: background .15s;
  }
  .toast-hash-link:hover { background: rgba(92,255,194,.15); }
  .toast.success { border-color: rgba(92,255,194,.3); }
  .toast.error   { border-color: rgba(255,107,107,.3); }
  .toast.info    { border-color: rgba(255,209,102,.3); }

  /* ── Misc ── */
  .empty { text-align: center; padding: 60px 20px; color: var(--muted); }
  .empty-icon { font-size: 42px; margin-bottom: 16px; }
  .empty-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .empty-sub { font-size: 13px; }

  .lookup-row { display: flex; gap: 10px; margin-bottom: 28px; }
  .lookup-row .input { margin-bottom: 0; }

  .notice {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px;
    background: rgba(255,209,102,.08);
    border: 1px solid rgba(255,209,102,.2);
    border-radius: 8px;
    font-size: 12px;
    font-family: var(--mono);
    color: var(--accent3);
    margin-bottom: 20px;
  }

  @media (max-width: 600px) {
    .row { grid-template-columns: 1fr; }
    .meta-grid { grid-template-columns: 1fr; }
    .header { flex-direction: column; align-items: flex-start; gap: 16px; }
    .escrow-actions { flex-direction: column; }
  }
`;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function shortHash(h) {
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}
function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ═══════════════════════════════════════════════════════════════════════════
// TOAST SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
let _toastId = 0;
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((type, title, msg, hash) => {
    const id = ++_toastId;
    setToasts((p) => [...p, { id, type, title, msg, hash }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 6000);
  }, []);
  return {
    toasts,
    toast: {
      success: (t, m, h) => add("success", t, m, h),
      error:   (t, m)    => add("error",   t, m),
      info:    (t, m)    => add("info",    t, m),
    },
  };
}

function Toasts({ toasts }) {
  const icons  = { success: "✓", error: "✕", info: "⚡" };
  const labels = { success: "Success", error: "Error", info: "Info" };
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <div className="toast-icon">{icons[t.type]}</div>
          <div>
            <div className="toast-title">{t.title || labels[t.type]}</div>
            {t.msg && <div className="toast-msg">{t.msg}</div>}
            {t.hash && (
              <a
                className="toast-hash-link"
                href={`${EXPLORER_BASE}/${t.hash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                🔗 {shortHash(t.hash)} ↗
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MILESTONE ROW
// ═══════════════════════════════════════════════════════════════════════════
function MilestoneRow({ index, done, isAuth, onComplete, loading, txHash }) {
  return (
    <div className="milestone-row">
      <div className={`ms-check ${done ? "done" : ""}`}>{done ? "✓" : ""}</div>
      <span className="ms-label">Milestone {index + 1}</span>
      <span className={`ms-status ${done ? "done" : ""}`}>
        {done ? "Completed" : "Pending"}
      </span>
      {/* Show explorer link if this milestone has a recorded tx */}
      {done && txHash && (
        <a
          className="tx-hash-link"
          href={`${EXPLORER_BASE}/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          title={txHash}
          onClick={(e) => e.stopPropagation()}
        >
          {shortHash(txHash)} ↗
        </a>
      )}
      {isAuth && !done && (
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => onComplete(index)}
          disabled={loading}
        >
          {loading ? <span className="spin" /> : "Mark Done"}
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TX HISTORY STRIP
// ═══════════════════════════════════════════════════════════════════════════
function TxHistory({ txs }) {
  if (!txs || txs.length === 0) return null;
  return (
    <div className="tx-history">
      <div className="tx-history-title">Transaction History</div>
      {txs.map((tx, i) => (
        <div key={i} className="tx-row">
          <span className={`tx-dot ${tx.type}`} />
          <span className="tx-label">{tx.label}</span>
          <span className="tx-time">{tx.time}</span>
          <a
            className="tx-hash-link"
            href={`${EXPLORER_BASE}/${tx.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            title={tx.hash}
          >
            {shortHash(tx.hash)} ↗
          </a>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ESCROW CARD
// ═══════════════════════════════════════════════════════════════════════════
function EscrowCard({ escrowId, escrow, walletAddress, onAction, toast }) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(null);
  // txs: { type, label, hash, time, milestoneIndex? }
  const [txs, setTxs]         = useState([]);

  const isPayer    = walletAddress && walletAddress === escrow.payer;
  const isReceiver = walletAddress && walletAddress === escrow.receiver;
  const total      = escrow.milestones.length;
  const completed  = escrow.milestones.filter(Boolean).length;
  const pct        = total === 0 ? 0 : Math.round((completed / total) * 100);
  const releasable = total === 0 ? 0 : Math.floor((escrow.total_amount * completed) / total);
  const pendingRelease = releasable - escrow.released;

  // Map milestoneIndex → tx hash for inline display
  const milestoneTxMap = txs.reduce((acc, tx) => {
    if (tx.type === "milestone" && tx.milestoneIndex != null) {
      acc[tx.milestoneIndex] = tx.hash;
    }
    return acc;
  }, {});

  function pushTx(type, label, hash, milestoneIndex) {
    setTxs((prev) => [{ type, label, hash, time: nowTime(), milestoneIndex }, ...prev]);
  }

  async function handleMilestone(index) {
    setLoading(`milestone-${index}`);
    try {
      const result = await completeMilestone({
        id: escrowId,
        index,
        payerAddress: walletAddress,
        signTransaction: sign,
      });
      const hash = result?.hash;
      toast.success("Milestone marked", `Milestone ${index + 1} completed`, hash);
      if (hash) pushTx("milestone", `Milestone ${index + 1} completed`, hash, index);
      onAction();
    } catch (e) {
      toast.error("Transaction failed", e.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleRelease() {
    setLoading("release");
    try {
      const result = await releaseEscrow({
        id: escrowId,
        receiverAddress: walletAddress,
        signTransaction: sign,
      });
      const hash = result?.hash;
      toast.success("Funds released", `${pendingRelease} XLM released`, hash);
      if (hash) pushTx("release", `Released ${pendingRelease} XLM`, hash);
      onAction();
    } catch (e) {
      toast.error("Release failed", e.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="escrow-card">
      {/* ── header ── */}
      <div className="escrow-header" onClick={() => setOpen((o) => !o)}>
        <div className="escrow-id">
          <span>#{escrowId}</span>
          {pct === 100 && (
            <span className="escrow-badge">All done</span>
          )}
          {isPayer && (
            <span className="escrow-badge" style={{ background: "rgba(255,209,102,.12)", color: "var(--accent3)" }}>
              Payer
            </span>
          )}
          {isReceiver && (
            <span className="escrow-badge" style={{ background: "rgba(255,107,107,.12)", color: "var(--accent2)" }}>
              Receiver
            </span>
          )}
          {txs.length > 0 && (
            <span className="escrow-badge" style={{ background: "rgba(92,255,194,.08)", color: "var(--muted)" }}>
              {txs.length} tx{txs.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className={`chevron ${open ? "open" : ""}`}>▾</span>
      </div>

      {/* ── body ── */}
      {open && (
        <div className="escrow-body">
          {/* meta */}
          <div className="meta-grid">
            <div className="meta-item">
              <div className="meta-key">Payer</div>
              <div className="meta-val">{escrow.payer.slice(0, 8)}…{escrow.payer.slice(-6)}</div>
            </div>
            <div className="meta-item">
              <div className="meta-key">Receiver</div>
              <div className="meta-val">{escrow.receiver.slice(0, 8)}…{escrow.receiver.slice(-6)}</div>
            </div>
            <div className="meta-item">
              <div className="meta-key">Total Amount</div>
              <div className="meta-val accent">{escrow.total_amount.toLocaleString()} XLM</div>
            </div>
            <div className="meta-item">
              <div className="meta-key">Milestones</div>
              <div className="meta-val">{completed} / {total}</div>
            </div>
          </div>

          {/* released */}
          <div className="released-row">
            <span className="released-label">Released so far</span>
            <span className="released-val">{escrow.released.toLocaleString()} XLM</span>
          </div>

          {/* progress */}
          <div className="progress-wrap">
            <div className="progress-label">
              <span>Completion</span>
              <span>{pct}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* milestones — pass in per-milestone tx hash */}
          <div className="milestones">
            {escrow.milestones.map((done, i) => (
              <MilestoneRow
                key={i}
                index={i}
                done={done}
                isAuth={isPayer}
                loading={loading === `milestone-${i}`}
                onComplete={handleMilestone}
                txHash={milestoneTxMap[i]}
              />
            ))}
          </div>

          {/* actions */}
          <div className="escrow-actions">
            {isReceiver && pendingRelease > 0 && (
              <button
                className="btn btn-primary"
                onClick={handleRelease}
                disabled={!!loading}
              >
                {loading === "release"
                  ? <><span className="spin" /> Releasing…</>
                  : `Release ${pendingRelease} XLM`}
              </button>
            )}
            {isPayer && pendingRelease > 0 && (
              <span style={{ fontSize: 13, color: "var(--accent3)", fontFamily: "var(--mono)" }}>
                ⏳ Awaiting receiver to release {pendingRelease} XLM
              </span>
            )}
            {pct === 100 && pendingRelease === 0 && (
              <span style={{ fontSize: 13, color: "var(--accent)", fontFamily: "var(--mono)" }}>
                ✓ Fully settled
              </span>
            )}
          </div>

          {/* tx history */}
          <TxHistory txs={txs} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE TAB
// ═══════════════════════════════════════════════════════════════════════════
function CreateTab({ walletAddress, toast, onCreated }) {
  const [form, setForm] = useState({
    id: "", receiver: "", total_amount: "", milestone_count: "3",
  });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!walletAddress) {
      toast.error("Wallet required", "Connect Freighter first");
      return;
    }
    if (!form.id || !form.receiver || !form.total_amount || !form.milestone_count) {
      toast.error("Missing fields", "Fill in all fields");
      return;
    }
    if (typeof form.id !== "string" || form.id.trim() === "") {
      toast.error("Invalid ID", "Escrow ID must be a non-empty string");
      return;
    }
    setLoading(true);
    try {
      const result = await createEscrow({
        id:              form.id.trim(),
        payer:           walletAddress,
        receiver:        form.receiver.trim(),
        total_amount:    Number(form.total_amount),
        milestone_count: Number(form.milestone_count),
        signTransaction: sign,
      });
      const hash = result?.hash;
      toast.success("Escrow created", `ID: ${form.id}`, hash);
      setForm({ id: "", receiver: "", total_amount: "", milestone_count: "3" });
      onCreated(form.id.trim());
    } catch (e) {
      toast.error("Create failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="card-title">New Escrow</div>

      <div className="field">
        <label className="label">Escrow ID (unique symbol)</label>
        <input
          className="input"
          placeholder="e.g. deal_001"
          value={form.id}
          onChange={set("id")}
        />
      </div>

      <div className="field">
        <label className="label">Receiver Address</label>
        <input
          className="input"
          placeholder="G…"
          value={form.receiver}
          onChange={set("receiver")}
        />
      </div>

      <div className="row">
        <div className="field">
          <label className="label">Total Amount (XLM)</label>
          <input
            className="input"
            type="number"
            placeholder="1000"
            value={form.total_amount}
            onChange={set("total_amount")}
          />
        </div>
        <div className="field">
          <label className="label">Milestone Count</label>
          <input
            className="input"
            type="number"
            min="1"
            max="20"
            placeholder="3"
            value={form.milestone_count}
            onChange={set("milestone_count")}
          />
        </div>
      </div>

      {walletAddress && (
        <div className="field">
          <label className="label">Payer (you)</label>
          <input
            className="input"
            value={walletAddress}
            readOnly
            style={{ opacity: .6 }}
          />
        </div>
      )}

      <button className="btn btn-primary btn-full" onClick={submit} disabled={loading}>
        {loading ? <><span className="spin" /> Creating…</> : "⬡  Create Escrow"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD TAB
// ═══════════════════════════════════════════════════════════════════════════
function DashboardTab({ walletAddress, toast }) {
  const [escrows, setEscrows] = useState({});
  const [lookupId, setLookupId] = useState("");
  const [loading, setLoading]   = useState(false);

  async function lookup() {
    const id = lookupId.trim();
    if (!id) {
      toast.error("Empty ID", "Enter an escrow ID to search");
      return;
    }
    setLoading(true);
    try {
      const data = await getEscrow(id, walletAddress ?? undefined);
      setEscrows((p) => ({ ...p, [id]: data }));
    } catch (e) {
      toast.error("Not found", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function refresh(id) {
    try {
      const data = await getEscrow(id, walletAddress ?? undefined);
      setEscrows((p) => ({ ...p, [id]: data }));
    } catch (_) {}
  }

  const ids = Object.keys(escrows);

  return (
    <>
      {!walletAddress && (
        <div className="notice">
          ⚡ Connect your wallet to mark milestones or release funds. Read-only lookup works without a wallet.
        </div>
      )}

      <div className="lookup-row">
        <input
          className="input"
          placeholder="Enter escrow ID to load…"
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
        />
        <button
          className="btn btn-secondary"
          onClick={lookup}
          disabled={loading}
          style={{ flexShrink: 0 }}
        >
          {loading ? <span className="spin" /> : "Load"}
        </button>
      </div>

      {ids.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">⬡</div>
          <div className="empty-title">No escrows loaded</div>
          <div className="empty-sub">Enter an escrow ID above or create one first.</div>
        </div>
      ) : (
        ids.map((id) => (
          <EscrowCard
            key={id}
            escrowId={id}
            escrow={escrows[id]}
            walletAddress={walletAddress}
            onAction={() => refresh(id)}
            toast={toast}
          />
        ))
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab]         = useState("create");
  const [wallet, setWallet]   = useState(null);
  const [connecting, setConn] = useState(false);
  const { toasts, toast }     = useToasts();

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = styles;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  async function connectWallet() {
    setConn(true);
    try {
      const accessResult = await freighterApi.requestAccess();
      if (accessResult.error) {
        toast.error("Access denied", accessResult.error);
        return;
      }
      const address =
        accessResult.address ||
        accessResult.publicKey ||
        (typeof freighterApi.getAddress === "function" &&
          (await freighterApi.getAddress()).address) ||
        (typeof freighterApi.getUserInfo === "function" &&
          (await freighterApi.getUserInfo()).publicKey);

      if (!address) {
        toast.error("No address found", "Could not retrieve wallet address");
        return;
      }
      setWallet(address);
      toast.success("Wallet connected", address.slice(0, 12) + "…");
    } catch (e) {
      toast.error("Connection failed", e.message);
    } finally {
      setConn(false);
    }
  }

  function disconnect() {
    setWallet(null);
    toast.info("Disconnected", "Wallet session ended");
  }

  function handleCreated() {
    setTab("dashboard");
  }

  return (
    <div className="app">
      <header className="header">
        {/* Logo + contract explorer link */}
        <div className="logo">
          <div className="logo-icon">⬡</div>
          <div>
            <div className="logo-text">EscrowChain</div>
            <div className="logo-sub">Soroban · Stellar Testnet</div>
            {CONTRACT_ID && (
              <a
                className="contract-link"
                href={CONTRACT_EXPLORER}
                target="_blank"
                rel="noopener noreferrer"
                title={CONTRACT_ID}
              >
                <span className="contract-link-dot" />
                {CONTRACT_ID.slice(0, 6)}…{CONTRACT_ID.slice(-4)} ↗
              </a>
            )}
          </div>
        </div>

        <button
          className="wallet-btn"
          onClick={wallet ? disconnect : connectWallet}
          disabled={connecting}
        >
          <span className={`wallet-dot ${wallet ? "connected" : ""}`} />
          {connecting
            ? "Connecting…"
            : wallet
            ? wallet.slice(0, 8) + "…" + wallet.slice(-4)
            : "Connect Freighter"}
        </button>
      </header>

      <div className="tabs">
        {[
          { key: "create",    label: "Create"    },
          { key: "dashboard", label: "Dashboard" },
        ].map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "create" && (
        <CreateTab walletAddress={wallet} toast={toast} onCreated={handleCreated} />
      )}
      {tab === "dashboard" && (
        <DashboardTab walletAddress={wallet} toast={toast} />
      )}

      <Toasts toasts={toasts} />
    </div>
  );
}