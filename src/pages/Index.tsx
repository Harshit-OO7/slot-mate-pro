import { useState } from 'react';
import { useParking } from '@/context/ParkingContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Clock, MapPin, Receipt, Zap, Shield, BarChart3, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import heroImage from '@/assets/hero-parking.jpg';

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const fadeScale = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export default function Index() {
  const { enterParking, exitParking, availableSlots, totalSlots, ratePerHour } = useParking();
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
    <div className="min-h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Background image with overlay */}
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 z-0"
        >
          <img
            src={heroImage}
            alt="Smart parking aerial view"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
        </motion.div>

        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — Copy */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="max-w-xl"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-mono text-primary mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
                System Status: Operational
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight leading-[1.05] mb-6">
                We lead the way in{' '}
                <span className="text-primary">smart parking</span>
                <span className="text-warning">.</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8">
                SQL-backed precision parking for malls, airports, and public sectors.
                Every slot is a row. Every transaction is a query.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="h-12 px-8 text-sm font-medium"
                  onClick={() => document.getElementById('parking-form')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-8 text-sm font-medium"
                  onClick={() => navigate('/admin')}
                >
                  Admin Panel
                </Button>
              </motion.div>

              {/* Live stats strip */}
              <motion.div variants={fadeUp} className="flex items-center gap-6 mt-10 pt-8 border-t border-border/30">
                {[
                  { value: `${availableSlots}`, label: 'Slots Free', color: 'text-success' },
                  { value: `₹${ratePerHour}`, label: 'Per Hour', color: 'text-warning' },
                  { value: '4', label: 'Active Zones', color: 'text-primary' },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className={`font-mono text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right — Form Card */}
            <motion.div
              variants={fadeScale}
              initial="hidden"
              animate="visible"
              id="parking-form"
              className="lg:ml-auto w-full max-w-md"
            >
              <div className="glass-panel p-8 relative overflow-hidden">
                {/* Glow accent */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                <h2 className="text-xl font-semibold text-foreground mb-1">
                  {mode === 'entry' ? 'Park Your Vehicle' : 'Exit & Pay'}
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {mode === 'entry' ? 'Enter your plate number to get assigned a slot.' : 'Enter your plate to calculate your bill.'}
                </p>

                <div className="flex rounded-lg bg-background p-1 mb-6">
                  {(['entry', 'exit'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => { setMode(m); setResult(null); setError(''); }}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-300 ${
                        mode === m ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-foreground'
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
                      className="font-mono text-lg h-14 bg-background border-border focus:border-primary/50 transition-colors"
                    />
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive font-mono"
                    >
                      {error}
                    </motion.div>
                  )}

                  <Button type="submit" className="w-full h-14 text-sm font-medium shadow-lg shadow-primary/20">
                    {mode === 'entry' ? 'Assign Slot' : 'Calculate & Exit'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>

                {/* Result */}
                <AnimatePresence mode="wait">
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-6 p-4 rounded-xl bg-background border border-border overflow-hidden"
                    >
                      {result.type === 'entry' ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-success" />
                            <span className="text-sm text-success font-medium">Slot Assigned Successfully</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm">Slot ID</span>
                            <span className="font-mono text-3xl font-bold text-foreground">{result.slot.id}</span>
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
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm">Total Bill</span>
                            <span className="font-mono text-3xl font-bold text-warning tabular-nums">
                              ₹{result.transaction.amount.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground/50 mt-2 break-all">
                            INSERT INTO transactions VALUES ('{result.transaction.plateNumber}', {result.transaction.amount.toFixed(2)}, {result.transaction.durationMinutes});
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-[10px] text-muted-foreground/40 text-center mt-4 font-mono">
                  Secured by SQL · Real-time updates
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background pointer-events-none" />
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tailored solutions across <span className="text-primary">multiple sectors</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From shopping malls to airports, our SQL-powered platform adapts to any parking environment with precision tracking and real-time analytics.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: MapPin, title: 'Smart Slot Assignment', desc: 'Auto-assign the nearest available slot via optimized SQL queries. Zero manual overhead.', delay: 0 },
              { icon: Clock, title: 'Live Duration Tracking', desc: 'Real-time timers with TIMESTAMPDIFF calculations. Accurate to the second.', delay: 0.1 },
              { icon: Receipt, title: 'Instant Billing', desc: 'Automated bill generation on exit. Every charge is a transparent SQL transaction.', delay: 0.2 },
              { icon: Database, title: 'SQL Transparency', desc: 'Toggle "View Source" to see every query. Full audit trail for invigilators.', delay: 0.3 },
              { icon: Shield, title: 'Multi-Sector Ready', desc: 'Malls, airports, hospitals, public lots. One system, infinite deployments.', delay: 0.4 },
              { icon: BarChart3, title: 'Admin Dashboard', desc: 'Real-time grid view with zone filtering, occupancy stats, and revenue tracking.', delay: 0.5 },
            ].map(feature => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: feature.delay, ease: [0.22, 1, 0.36, 1] }}
                className="glass-panel p-6 group hover:border-primary/20 transition-colors duration-500"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-500">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="container mx-auto max-w-3xl text-center"
        >
          <div className="glass-panel p-12 relative overflow-hidden">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <h2 className="text-3xl font-bold text-foreground mb-4 relative">
              Ready to modernize your parking?
            </h2>
            <p className="text-muted-foreground mb-8 relative">
              See the SQL behind every decision. Deploy in minutes.
            </p>
            <div className="flex justify-center gap-3 relative">
              <Button size="lg" className="h-12 px-8 shadow-lg shadow-primary/20" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                Start Parking
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8" onClick={() => navigate('/admin')}>
                View Live Demo
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="font-mono font-bold text-[10px] text-primary-foreground">P</span>
            </div>
            <span className="text-sm font-medium text-foreground">ParkSQL</span>
          </div>
          <p className="text-xs text-muted-foreground/50 font-mono">
            © 2026 ParkSQL — Every slot is a row. Every transaction is a query.
          </p>
        </div>
      </footer>
    </div>
  );
}
