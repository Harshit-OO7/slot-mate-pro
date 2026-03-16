import { useState } from 'react';
import { useParking } from '@/context/ParkingContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Clock, MapPin, Receipt, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

export default function Index() {
  const { enterParking, exitParking, activeSession, availableSlots, totalSlots, ratePerHour, calculateBill } = useParking();
  const [plateNumber, setPlateNumber] = useState('');
  const [mode, setMode] = useState<'entry' | 'exit'>('entry');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!plateNumber.trim()) {
      setError('Please enter a valid plate number');
      return;
    }

    if (mode === 'entry') {
      const slot = enterParking(plateNumber);
      if (slot) {
        setResult({ type: 'entry', slot });
        setPlateNumber('');
      } else {
        setError('No available slots. Please try again later.');
      }
    } else {
      const tx = exitParking(plateNumber);
      if (tx) {
        setResult({ type: 'exit', transaction: tx });
        setPlateNumber('');
      } else {
        setError('Vehicle not found in the system.');
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-12">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 max-w-2xl"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs font-mono text-muted-foreground mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
          System Status: Operational
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-4">
          Park<span className="text-primary">SQL</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Intelligent parking management with real-time SQL-backed operations.
          Every transaction is a query. Every slot is a row.
        </p>
      </motion.div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg w-full">
        {[
          { icon: MapPin, label: 'Available', value: `${availableSlots}/${totalSlots}`, color: 'text-success' },
          { icon: Clock, label: 'Rate', value: `₹${ratePerHour}/hr`, color: 'text-warning' },
          { icon: Zap, label: 'Zones', value: '4 Active', color: 'text-primary' },
        ].map(stat => (
          <div key={stat.label} className="glass-panel p-4 text-center">
            <stat.icon className={`w-4 h-4 mx-auto mb-2 ${stat.color}`} />
            <div className={`font-mono text-lg font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Mode Toggle + Form */}
      <motion.div layout className="glass-panel p-6 w-full max-w-md">
        <div className="flex rounded-lg bg-background p-1 mb-6">
          {(['entry', 'exit'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setResult(null); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'entry' ? 'Enter Parking' : 'Exit Parking'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 block">
              Vehicle Plate Number
            </label>
            <Input
              value={plateNumber}
              onChange={e => setPlateNumber(e.target.value.toUpperCase())}
              placeholder="e.g. MH-12-AB-1234"
              className="font-mono text-lg h-12 bg-background border-border"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive font-mono">{error}</div>
          )}

          <Button type="submit" className="w-full h-12 text-sm font-medium">
            {mode === 'entry' ? 'Assign Slot' : 'Calculate & Exit'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 p-4 rounded-lg bg-background border border-border"
            >
              {result.type === 'entry' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-sm text-success font-medium">Slot Assigned Successfully</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Slot ID</span>
                    <span className="font-mono text-2xl font-bold text-foreground">{result.slot.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Plate</span>
                    <span className="font-mono text-sm text-foreground">{result.slot.currentPlate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Entry Time</span>
                    <span className="font-mono text-sm text-foreground tabular-nums">
                      {result.slot.entryTime?.toLocaleTimeString()}
                    </span>
                  </div>
                  <Button variant="outline" className="w-full mt-2" onClick={() => navigate('/dashboard')}>
                    <Receipt className="w-4 h-4 mr-2" />
                    View Dashboard
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm text-primary font-medium">Exit Processed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Duration</span>
                    <span className="font-mono text-sm text-foreground tabular-nums">
                      {result.transaction.durationMinutes} min
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Total Bill</span>
                    <span className="font-mono text-2xl font-bold text-warning tabular-nums">
                      ₹{result.transaction.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground/50 mt-2">
                    INSERT INTO transactions (plate_number, amount, duration_minutes) VALUES ('{result.transaction.plateNumber}', {result.transaction.amount.toFixed(2)}, {result.transaction.durationMinutes});
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <button 
        onClick={() => navigate('/admin')} 
        className="mt-8 text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
      >
        Invigilator? View Admin Grid →
      </button>
    </div>
  );
}
