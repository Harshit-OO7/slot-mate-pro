import { useState } from 'react';
import { useParking, LOCATIONS, ParkingLocation } from '@/context/ParkingContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Clock, MapPin, Receipt, Plane, Train, Building2, ArrowLeft, Zap } from 'lucide-react';
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

const locationIcons: Record<string, typeof Building2> = {
  'tech-park': Building2,
  'airport': Plane,
  'railway': Train,
};

export default function Index() {
  const { enterParking, exitParking, selectedLocation, selectLocation, slots } = useParking();
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
        setError('No available slots at this location.');
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

  const getLocationStats = (loc: ParkingLocation) => {
    const locSlots = slots.filter(s => s.locationId === loc.id);
    const available = locSlots.filter(s => s.status === 'available').length;
    const total = locSlots.length;
    const occupancy = total > 0 ? Math.round(((total - available) / total) * 100) : 0;
    return { available, total, occupancy };
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[90vh] flex items-center">
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 z-0"
        >
          <img src={heroImage} alt="Smart parking aerial view" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
        </motion.div>

        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — Copy */}
            <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-xl">
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-mono text-primary mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
                {selectedLocation ? `Connected: ${selectedLocation.name}` : 'System Status: Operational'}
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight leading-[1.05] mb-6">
                {selectedLocation ? (
                  <>Park at <span className="text-primary">{selectedLocation.name}</span><span className="text-warning">.</span></>
                ) : (
                  <>We lead the way in <span className="text-primary">smart parking</span><span className="text-warning">.</span></>
                )}
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8">
                {selectedLocation
                  ? `${selectedLocation.address} — ₹${selectedLocation.ratePerHour}/hr · ${selectedLocation.zones.length} zones`
                  : 'SQL-backed precision parking for tech parks, airports, and railway stations across Chennai.'}
              </motion.p>

              {selectedLocation && (
                <motion.div variants={fadeUp} className="flex items-center gap-6 pt-6 border-t border-border/30 mb-8">
                  {(() => {
                    const stats = getLocationStats(selectedLocation);
                    return [
                      { value: `${stats.available}`, label: 'Available', color: 'text-success' },
                      { value: `${stats.total}`, label: 'Total Slots', color: 'text-foreground' },
                      { value: `₹${selectedLocation.ratePerHour}`, label: 'Per Hour', color: 'text-warning' },
                      { value: `${stats.occupancy}%`, label: 'Occupancy', color: stats.occupancy > 80 ? 'text-destructive' : 'text-primary' },
                    ];
                  })().map(stat => (
                    <div key={stat.label}>
                      <div className={`font-mono text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                    </div>
                  ))}
                </motion.div>
              )}

              {!selectedLocation && (
                <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    className="h-12 px-8 text-sm font-medium"
                    onClick={() => document.getElementById('location-picker')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Choose Location
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                    <Button variant="outline" size="lg" className="h-12 px-8 text-sm font-medium" onClick={() => navigate('/admin-login')}>
                      Login as Admin →
                    </Button>
                </motion.div>
              )}
            </motion.div>

            {/* Right — Form or Location Picker */}
            <div className="lg:ml-auto w-full max-w-md">
              <AnimatePresence mode="wait">
                {selectedLocation ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.4 }}
                    id="parking-form"
                  >
                    <div className="glass-panel p-8 relative overflow-hidden">
                      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                      <button
                        onClick={() => selectLocation('')}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-4"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        Change Location
                      </button>

                      <h2 className="text-xl font-semibold text-foreground mb-1">
                        {mode === 'entry' ? 'Park Your Vehicle' : 'Exit & Pay'}
                      </h2>
                      <p className="text-sm text-muted-foreground mb-6">
                        {mode === 'entry' ? `Assign a slot at ${selectedLocation.name}.` : 'Enter your plate to calculate your bill.'}
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
                            placeholder="e.g. TN-22-AB-1234"
                            className="font-mono text-lg h-14 bg-background border-border focus:border-primary/50 transition-colors"
                          />
                        </div>

                        {error && (
                          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-destructive font-mono">
                            {error}
                          </motion.div>
                        )}

                        <Button type="submit" className="w-full h-14 text-sm font-medium shadow-lg shadow-primary/20">
                          {mode === 'entry' ? 'Assign Slot' : 'Calculate & Exit'}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </form>

                      <AnimatePresence mode="wait">
                        {result && (
                          <motion.div
                            initial={{ opacity: 0, y: 15, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            transition={{ duration: 0.4 }}
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
                                  <span className="text-muted-foreground text-sm">Location</span>
                                  <span className="text-sm text-foreground">{selectedLocation.name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground text-sm">Plate</span>
                                  <span className="font-mono text-sm text-foreground">{result.slot.currentPlate}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground text-sm">Entry Time</span>
                                  <span className="font-mono text-sm text-foreground tabular-nums">{result.slot.entryTime?.toLocaleTimeString()}</span>
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
                                  <span className="font-mono text-sm text-foreground tabular-nums">{result.transaction.durationMinutes} min</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground text-sm">Total Bill</span>
                                  <span className="font-mono text-3xl font-bold text-warning tabular-nums">₹{result.transaction.amount.toFixed(2)}</span>
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
                ) : (
                  <motion.div
                    key="quick-pick"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.4 }}
                    className="glass-panel p-8"
                  >
                    <h2 className="text-xl font-semibold text-foreground mb-1">Quick Select</h2>
                    <p className="text-sm text-muted-foreground mb-6">Choose a location to get started</p>
                    <div className="space-y-3">
                      {LOCATIONS.map((loc, i) => {
                        const stats = getLocationStats(loc);
                        const Icon = locationIcons[loc.type] || MapPin;
                        return (
                          <motion.button
                            key={loc.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => selectLocation(loc.id)}
                            className="w-full p-4 rounded-xl bg-background border border-border hover:border-primary/30 transition-all duration-300 text-left group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <Icon className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-foreground text-sm">{loc.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{loc.address}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono text-sm font-bold text-success tabular-nums">{stats.available}/{stats.total}</div>
                                <div className="text-[10px] text-muted-foreground">₹{loc.ratePerHour}/hr</div>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ===== LOCATION CARDS SECTION ===== */}
      <section className="py-24 px-4 relative" id="location-picker">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background pointer-events-none" />
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Choose your <span className="text-primary">parking location</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We operate across key locations in Chennai. Select a venue to view real-time availability and park your vehicle.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {LOCATIONS.map((loc, i) => {
              const stats = getLocationStats(loc);
              const Icon = locationIcons[loc.type] || MapPin;
              const occupancyPercent = stats.total > 0 ? ((stats.total - stats.available) / stats.total) * 100 : 0;

              return (
                <motion.div
                  key={loc.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  onClick={() => {
                    selectLocation(loc.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="glass-panel p-6 cursor-pointer group hover:border-primary/30 transition-all duration-500 relative overflow-hidden"
                >
                  <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500 pointer-events-none" />

                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-500">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{loc.name}</h3>
                      <p className="text-xs text-muted-foreground">{loc.address}</p>
                    </div>
                  </div>

                  {/* Occupancy bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Occupancy</span>
                      <span className="font-mono tabular-nums">{Math.round(occupancyPercent)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-background overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${occupancyPercent}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.15 }}
                        className={`h-full rounded-full ${occupancyPercent > 80 ? 'bg-destructive' : occupancyPercent > 50 ? 'bg-warning' : 'bg-success'}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 rounded-lg bg-background">
                      <div className="font-mono text-lg font-bold text-success tabular-nums">{stats.available}</div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Free</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-background">
                      <div className="font-mono text-lg font-bold text-foreground tabular-nums">{stats.total}</div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-background">
                      <div className="font-mono text-lg font-bold text-warning tabular-nums">₹{loc.ratePerHour}</div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">/Hour</div>
                    </div>
                  </div>

                  <div className="mt-4 text-xs font-mono text-muted-foreground/50">
                    Zones: {loc.zones.join(', ')} · {loc.slotsPerZone} slots/zone
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Select Location <ArrowRight className="w-3 h-3" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
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
