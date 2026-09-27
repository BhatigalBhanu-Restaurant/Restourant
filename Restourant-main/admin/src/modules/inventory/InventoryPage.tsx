import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/PermissionGate';
import { CalendarDays, ClipboardList, DollarSign, Plus, Save, Trash2, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';

type LedgerRow = { key: string; name: string; amount: number; note?: string };
type Totals = { incomeTotal: number; expenseTotal: number; profit: number; days?: number };

const today = () => new Date().toISOString().slice(0, 10);
const money = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const InventoryPage: React.FC = () => {
  const [date, setDate] = useState(today());
  const [expenses, setExpenses] = useState<LedgerRow[]>([]);
  const [income, setIncome] = useState<LedgerRow[]>([]);
  const [monthly, setMonthly] = useState<Totals>({ incomeTotal: 0, expenseTotal: 0, profit: 0, days: 0 });
  const [yearly, setYearly] = useState<Totals>({ incomeTotal: 0, expenseTotal: 0, profit: 0, days: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [addItemType, setAddItemType] = useState<'expense' | 'income' | null>(null);
  const [newItem, setNewItem] = useState({ name: '', amount: '', note: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [ledgerRes, summaryRes]: any = await Promise.all([
        apiClient.get(`/inventory/daily-ledger?date=${date}`, { forceFresh: true }),
        apiClient.get(`/inventory/daily-ledger/summary?date=${date}`, { forceFresh: true })
      ]);
      if (ledgerRes.success) { setExpenses(ledgerRes.data.ledger.expenses || []); setIncome(ledgerRes.data.ledger.income || []); }
      if (summaryRes.success) { setMonthly(summaryRes.data.monthly); setYearly(summaryRes.data.yearly); }
    } catch (error: any) { setMessage(error.message || 'Could not load inventory ledger.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [date]);

  const totals = useMemo(() => {
    const expenseTotal = expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const incomeTotal = income.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return { expenseTotal, incomeTotal, profit: incomeTotal - expenseTotal };
  }, [expenses, income]);

  const updateRow = (kind: 'expense' | 'income', index: number, field: 'amount' | 'note' | 'name', value: string) => {
    const setRows = kind === 'expense' ? setExpenses : setIncome;
    setRows(rows => rows.map((row, i) => i === index ? { ...row, [field]: field === 'amount' ? Math.max(0, Number(value || 0)) : value } : row));
  };
  const openAddItem = (kind: 'expense' | 'income') => {
    setNewItem({ name: '', amount: '', note: '' });
    setAddItemType(kind);
  };
  const addRow = () => {
    if (!addItemType || !newItem.name.trim()) return;
    const setRows = addItemType === 'expense' ? setExpenses : setIncome;
    setRows(rows => [...rows, { key: `custom_${Date.now()}`, name: newItem.name.trim(), amount: Math.max(0, Number(newItem.amount || 0)), note: newItem.note.trim() }]);
    setAddItemType(null);
  };
  const deleteRow = (kind: 'expense' | 'income', index: number) => (kind === 'expense' ? setExpenses : setIncome)(rows => rows.filter((_, i) => i !== index));

  const save = async () => {
    try {
      setSaving(true);
      const res: any = await apiClient.put('/inventory/daily-ledger', { date, expenses, income });
      if (res.success) { setMessage(`Daily ledger for ${date} saved successfully.`); setShowSaveConfirm(false); await load(); }
    } catch (error: any) { setMessage(error.message || 'Could not save the daily ledger.'); }
    finally { setSaving(false); }
  };

  const rows = (kind: 'expense' | 'income', data: LedgerRow[], accent: string) => (
    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 16 }}>
      <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-3" style={{ borderRadius: '16px 16px 0 0' }}>
        <div><h5 className="mb-0 fw-bold">{kind === 'expense' ? 'Daily Expenses (ખર્ચ)' : 'Daily Income (આવક)'}</h5><small className="text-muted">Enter actual amounts manually for this date</small></div>
        <button type="button" className={`btn btn-sm btn-outline-${accent} fw-semibold`} onClick={() => openAddItem(kind)}><Plus size={15} className="me-1" />Add item</button>
      </div>
      <div className="table-responsive"><table className="table align-middle mb-0"><thead className="table-light"><tr><th className="ps-3" style={{ width: 45 }}>#</th><th>Item / વિગત</th><th style={{ minWidth: 150 }}>Note</th><th className="text-end" style={{ minWidth: 145 }}>Amount (₹)</th><th /></tr></thead>
      <tbody>{data.map((row, index) => <tr key={row.key}><td className="ps-3 text-muted">{index + 1}</td><td><input className="form-control form-control-sm border-0 bg-transparent fw-semibold" value={row.name} placeholder="Expense item" onChange={e => updateRow(kind, index, 'name', e.target.value)} /></td><td><input className="form-control form-control-sm" value={row.note || ''} placeholder="Optional" onChange={e => updateRow(kind, index, 'note', e.target.value)} /></td><td><input type="number" min="0" className="form-control form-control-sm text-end fw-bold" value={row.amount || ''} placeholder="0" onChange={e => updateRow(kind, index, 'amount', e.target.value)} /></td><td><button className="btn btn-sm btn-outline-danger border-0" title="Remove item" onClick={() => deleteRow(kind, index)}><Trash2 size={15} /></button></td></tr>)}
      <tr className="table-light"><td colSpan={3} className="text-end fw-bold">Total {kind === 'expense' ? 'expense' : 'income'}</td><td className={`text-end fw-bold text-${accent}`}>{money(kind === 'expense' ? totals.expenseTotal : totals.incomeTotal)}</td><td /></tr></tbody></table></div>
    </div>
  );

  return <div className="container-fluid px-0">
    <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: 16 }}><div className="card-body p-3 p-md-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
      <div className="d-flex align-items-center gap-3"><div className="rounded-3 p-2 text-white" style={{ background: 'var(--brand-maroon, #7A1B28)' }}><ClipboardList size={25} /></div><div><h4 className="fw-bold mb-1">Inventory & Daily Profit Ledger</h4><div className="text-muted small">Daily operating costs, income, and profit — ખર્ચ, આવક અને નફો</div></div></div>
      <div className="d-flex align-items-center gap-2"><CalendarDays size={18} className="text-primary" /><input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} /><button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowSaveConfirm(true)} disabled={loading}><Save size={16} />Save daily ledger</button></div>
    </div></div>
    {message && <div className="alert alert-info alert-dismissible fade show py-2"><small>{message}</small><button className="btn-close" onClick={() => setMessage('')} /></div>}
    <div className="row g-3 mb-3">
      {[['Today income', totals.incomeTotal, 'success', TrendingUp], ['Today expenses', totals.expenseTotal, 'danger', TrendingDown], ['Today profit', totals.profit, totals.profit >= 0 ? 'primary' : 'danger', WalletCards]].map(([label, value, color, Icon]: any) => <div className="col-12 col-md-4" key={label}><div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}><div className="card-body d-flex align-items-center justify-content-between"><div><div className="small text-muted fw-semibold">{label}</div><div className={`fs-4 fw-bold text-${color}`}>{money(value)}</div></div><Icon size={29} className={`text-${color} opacity-75`} /></div></div></div>)}
    </div>
    <div className="row g-3 mb-3"><div className="col-12 col-lg-6">{rows('expense', expenses, 'danger')}</div><div className="col-12 col-lg-6">{rows('income', income, 'success')}</div></div>
    <div className="row g-3"><div className="col-12 col-md-6"><div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}><div className="card-body"><h6 className="fw-bold">This month ({monthly.days || 0} saved days)</h6><div className="d-flex justify-content-between small"><span>Income {money(monthly.incomeTotal)}</span><span>Costs {money(monthly.expenseTotal)}</span><strong className={monthly.profit >= 0 ? 'text-success' : 'text-danger'}>Profit {money(monthly.profit)}</strong></div></div></div></div><div className="col-12 col-md-6"><div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}><div className="card-body"><h6 className="fw-bold">This year ({yearly.days || 0} saved days)</h6><div className="d-flex justify-content-between small"><span>Income {money(yearly.incomeTotal)}</span><span>Costs {money(yearly.expenseTotal)}</span><strong className={yearly.profit >= 0 ? 'text-success' : 'text-danger'}>Profit {money(yearly.profit)}</strong></div></div></div></div></div>
    <Modal isOpen={showSaveConfirm} onClose={() => setShowSaveConfirm(false)} title="Save daily inventory ledger"><div className="p-3"><p>Save the costs and income entered for <strong>{date}</strong>?</p><div className="rounded-3 bg-light border p-3 small"><div className="d-flex justify-content-between"><span>Total expenses</span><strong className="text-danger">{money(totals.expenseTotal)}</strong></div><div className="d-flex justify-content-between"><span>Total income</span><strong className="text-success">{money(totals.incomeTotal)}</strong></div><hr className="my-2" /><div className="d-flex justify-content-between fw-bold"><span>Net profit</span><span className={totals.profit >= 0 ? 'text-primary' : 'text-danger'}>{money(totals.profit)}</span></div></div><div className="d-flex justify-content-end gap-2 mt-3"><button className="btn btn-light" onClick={() => setShowSaveConfirm(false)}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Confirm & save'}</button></div></div></Modal>
    <Modal isOpen={!!addItemType} onClose={() => setAddItemType(null)} title={addItemType === 'expense' ? 'Add daily expense item' : 'Add daily income item'}>
      <div className="p-3">
        <div className="rounded-3 p-3 mb-3" style={{ background: addItemType === 'expense' ? '#fff5f5' : '#f1fbf5', border: `1px solid ${addItemType === 'expense' ? '#f1c1c1' : '#bce5c9'}` }}>
          <div className="fw-bold">{addItemType === 'expense' ? 'Expense / ખર્ચ' : 'Income / આવક'}</div>
          <div className="small text-muted mt-1">Add a separate item for today’s ledger. You can edit the amount later if needed.</div>
        </div>
        <div className="mb-3"><label className="form-label small fw-bold">Item name <span className="text-danger">*</span></label><input autoFocus className="form-control" placeholder={addItemType === 'expense' ? 'e.g. Staff tea, Transport, Repair' : 'e.g. Catering order, Delivery sale'} value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') addRow(); }} /></div>
        <div className="row g-2"><div className="col-6"><label className="form-label small fw-bold">Amount (₹)</label><input type="number" min="0" className="form-control" placeholder="0" value={newItem.amount} onChange={e => setNewItem({ ...newItem, amount: e.target.value })} /></div><div className="col-6"><label className="form-label small fw-bold">Note <span className="text-muted fw-normal">(optional)</span></label><input className="form-control" placeholder="Supplier / details" value={newItem.note} onChange={e => setNewItem({ ...newItem, note: e.target.value })} /></div></div>
        <div className="d-flex justify-content-end gap-2 mt-4"><button className="btn btn-light" onClick={() => setAddItemType(null)}>Cancel</button><button className={`btn btn-${addItemType === 'expense' ? 'danger' : 'success'}`} disabled={!newItem.name.trim()} onClick={addRow}><Plus size={16} className="me-1" />Add item</button></div>
      </div>
    </Modal>
  </div>;
};
