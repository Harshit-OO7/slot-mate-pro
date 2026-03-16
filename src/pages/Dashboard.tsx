import { useParking } from '@/context/ParkingContext';
import { motion } from 'framer-motion';
import { Clock, MapPin, Receipt, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

function LiveBill({ entryTime, rate }: { entryTime: Date; rate: number }) {
  const [bill, setBill] = useState({ duration: 0, amount: 0 });

  useEffect(() => {
    const tick = () => {
      const diffMs = Date.now() - entryTime.getTime();
      const minutes = Math.max(1, Math.ceil(diffMs / 60000));
      const amount = Math.ceil((minutes / 60) * rate * 100) / 100;
      setBill({ duration: minutes, amount });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [entryTime, rate]);

  const h = Math.floor(bill.duration / 60);
  const m = bill.duration % 60;

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 text-center">
        <Clock className="w-5 h-5 mx-auto mb-2 text-warning" />
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Duration</div>
        <div className="font-mono text-3xl font-bold tabular-nums text-foreground">
          {String(h).padStart(2, '0')}h {String(m).padStart(2, '0')}m
        </div>
      </div>
      <div className="glass-panel p-6 text-center">
        <TrendingUp className="w-5 h-5 mx-auto mb-2 text-success" />
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Bill</div>
        <div className="font-mono text-4xl font-bold tabular-nums text-warning">
          ₹{bill.amount.toFixed(2)}
        </div>
        <div className="text-[10px] font-mono text-muted-foreground mt-2">
          @ ₹{rate}/hr
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { activeSession, slots, transactions, ratePerHour } = useParking();

  const activeSlot = activeSession ? slots.find(s => s.id === activeSession.slotId) : null;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="container mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
          <p className="text-sm text-muted-foreground mb-8">Real-time parking session overview</p>
        </motion.div>

        {activeSession && activeSlot ? (
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <div className="glass-panel p-6 space-y-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Active Session</div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-mono text-3xl font-bold text-foreground">{activeSession.slotId}</div>
                    <div className="text-sm text-muted-foreground">Zone {activeSlot.zone}</div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/50">
                  <InfoRow label="Plate Number" value={activeSession.plateNumber} mono />
                  <InfoRow label="Entry Time" value={activeSession.entryTime.toLocaleString()} mono />
                  <InfoRow label="Rate" value={`₹${ratePerHour}/hour`} />
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <LiveBill entryTime={activeSession.entryTime} rate={ratePerHour} />
            </motion.div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-12 text-center">
            <Receipt className="w-8 h-8 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">No active parking session</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Enter a vehicle from the home page to start a session</p>
          </motion.div>
        )}

        {/* Transaction History */}
        {transactions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-10">
            <h2 className="text-lg font-semibold text-foreground mb-4">Transaction History</h2>
            <div className="glass-panel overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wider p-3">Plate</th>
                    <th className="text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wider p-3">Slot</th>
                    <th className="text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wider p-3">Duration</th>
                    <th className="text-right text-[10px] font-mono text-muted-foreground uppercase tracking-wider p-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-border/30">
                      <td className="p-3 font-mono text-sm text-foreground">{tx.plateNumber}</td>
                      <td className="p-3 font-mono text-sm text-muted-foreground">{tx.slotId}</td>
                      <td className="p-3 font-mono text-sm tabular-nums text-muted-foreground">{tx.durationMinutes} min</td>
                      <td className="p-3 font-mono text-sm tabular-nums text-warning text-right">₹{tx.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-foreground ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
