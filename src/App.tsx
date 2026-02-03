import { useState, useMemo, useRef } from 'react';
import './App.css';
import type { Participant, Expense, Settlement } from './types';

// Utility for formatting currency (KRW or just number)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
};

function App() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Input states
  const [newName, setNewName] = useState('');
  const [newExpensePayer, setNewExpensePayer] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseDesc, setNewExpenseDesc] = useState('');

  // Refs for focus management
  const amountInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Add Participant
  const addParticipant = () => {
    if (!newName.trim()) return;
    const newId = Date.now().toString();
    setParticipants([...participants, { id: newId, name: newName.trim() }]);
    setNewName('');
    nameInputRef.current?.focus();
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const startExpenseEntry = () => {
    if (participants.length < 2) {
      alert("At least 2 participants are required to split bills.");
      return;
    }
    // Default to first participant if not set
    if (!newExpensePayer) {
      setNewExpensePayer(participants[0].id);
    }
    setStep(2);
    // Use timeout to wait for render
    setTimeout(() => amountInputRef.current?.focus(), 100);
  };

  // Step 2: Add Expense
  const addExpense = () => {
    const amount = parseFloat(newExpenseAmount);
    if (!newExpensePayer || isNaN(amount) || amount <= 0) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      payerId: newExpensePayer,
      amount,
      description: newExpenseDesc
    };
    setExpenses([...expenses, newExpense]);

    // Clear valid inputs but keep payer selected for multi-entry
    setNewExpenseAmount('');
    setNewExpenseDesc('');

    // Refocus on amount for rapid entry
    amountInputRef.current?.focus();
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const calculateSettlement = () => {
    setStep(3);
  };

  // Step 3: Calculation Logic
  const settlements = useMemo(() => {
    if (participants.length === 0) return [];

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const average = totalSpent / participants.length;

    // Calculate balances: Paid - Average
    // Positive = Spent more than average (Receives money)
    // Negative = Spent less than average (Gives money)
    let balances = participants.map(p => {
      const paid = expenses
        .filter(e => e.payerId === p.id)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        ...p,
        paid,
        balance: paid - average
      };
    });

    const results: Settlement[] = [];

    // Copy balances to avoid mutating state derived objects if any
    balances = balances.map(b => ({ ...b }));

    // Sort to facilitate greedy matching: Ascending (Debtors first)
    // We process until balances are approximately 0
    let loopCount = 0;
    while (loopCount < 100) {
      balances.sort((a, b) => a.balance - b.balance);

      const debtor = balances[0];
      const creditor = balances[balances.length - 1];

      // If smallest balances are approx 0, we are done
      if (Math.abs(debtor.balance) < 1 && Math.abs(creditor.balance) < 1) break;

      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);

      // debtor pays creditor 'amount'
      if (amount > 0) {
        results.push({
          fromId: debtor.id,
          toId: creditor.id,
          amount
        });
      }

      debtor.balance += amount;
      creditor.balance -= amount;
      loopCount++;
    }

    return results;
  }, [participants, expenses]);

  const totalTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="App">
      <div className="glass-header">
        <h1>💸 TravelCal</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Easy Travel Expense Splitting</p>
      </div>

      {step === 1 && (
        <div className="card fade-in">
          <h2>Who is traveling?</h2>
          <div className="input-group" style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Enter name (e.g. Alice)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
              autoFocus
            />
            <button onClick={addParticipant}>Add</button>
          </div>

          <div className="participant-list">
            {participants.map(p => (
              <span key={p.id} className="chip">
                {p.name}
                <span className="chip-remove" onClick={() => removeParticipant(p.id)}>×</span>
              </span>
            ))}
          </div>

          {participants.length > 0 && (
            <div style={{ marginTop: '2rem', textAlign: 'right' }}>
              <button onClick={startExpenseEntry}>Next: Add Expenses →</button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Recorded Expenses</h2>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
              Total: {formatCurrency(totalTotal)}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--color-text-muted)' }}>Add New Expense</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Payer</label>
                <select
                  value={newExpensePayer}
                  onChange={(e) => setNewExpensePayer(e.target.value)}
                >
                  {participants.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>Amount</label>
                <input
                  ref={amountInputRef}
                  type="number"
                  placeholder="0"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addExpense()}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Description (optional)"
                value={newExpenseDesc}
                onChange={(e) => setNewExpenseDesc(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addExpense()}
              />
              <button onClick={addExpense} style={{ whiteSpace: 'nowrap' }}>+ Add</button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', margin: 0 }}>
              * Tip: Ensure the Payer is correct, then type <strong>Amount [Enter] Description [Enter]</strong> to add quickly.
            </p>
          </div>

          <div className="expense-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {expenses.slice().reverse().map((e) => (
              <div key={e.id} className="expense-item">
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                    {participants.find(p => p.id === e.payerId)?.name}
                  </span>
                  <span style={{ margin: '0 0.5rem', color: 'var(--color-text-muted)' }}>paid</span>
                  <span className="currency">{formatCurrency(e.amount)}</span>
                  {e.description && <span style={{ marginLeft: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.9em' }}>({e.description})</span>}
                </div>
                <button
                  className="danger"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', marginLeft: '1rem' }}
                  onClick={() => removeExpense(e.id)}
                >
                  Delete
                </button>
              </div>
            ))}
            {expenses.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No expenses recorded yet.</p>
            )}
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
            <button className="secondary" onClick={() => setStep(1)}>← Back</button>
            <button onClick={calculateSettlement} disabled={expenses.length === 0}>Calculate Settlement →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card fade-in">
          <h2>Settlement Plan</h2>
          <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)' }}>
            Each person should spend approx. <strong>{formatCurrency(totalTotal / participants.length)}</strong>.
          </p>

          <div className="settlement-results">
            {settlements.length === 0 ? (
              <p>Everything is balanced! No transfers needed.</p>
            ) : (
              settlements.map((s, i) => (
                <div key={i} className="result-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-danger)' }}>{participants.find(p => p.id === s.fromId)?.name}</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9em' }}>sends</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-success)', fontSize: '1.2em' }}>{participants.find(p => p.id === s.toId)?.name}</span>
                  </div>
                  <div className="currency" style={{ color: 'var(--color-text)', fontSize: '1.2em', marginLeft: '1rem' }}>
                    {formatCurrency(s.amount)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: '2rem' }}>
            <button className="secondary" onClick={() => setStep(2)}>← Edit Expenses</button>
            <button className="danger" onClick={() => {
              if (confirm('Start over? All data will be lost.')) {
                setParticipants([]);
                setExpenses([]);
                setStep(1);
              }
            }} style={{ marginLeft: '1rem' }}>Reset All</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
