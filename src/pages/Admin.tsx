import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParking, LOCATIONS, ParkingSlot, Transaction } from '@/context/ParkingContext';
import SlotGrid from '@/components/SlotGrid';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Activity, DollarSign, MapPin, Terminal, Table2,
  Users, LogOut, Play, Search, Car, Clock, BarChart3, Layers
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  SAMPLE_CUSTOMERS, SAMPLE_PAYMENTS, SAMPLE_VEHICLE_LOGS, SAMPLE_AUDIT_LOGS
} from '@/data/sampleData';

type AdminTab = 'overview' | 'slots' | 'console' | 'transactions';

const PRESET_QUERIES = [
  { label: 'All Locations', query: "SELECT * FROM locations ORDER BY name;" },
  { label: 'Available Slots', query: "SELECT id, zone, location_id FROM parking_slots WHERE status = 'available' ORDER BY location_id, zone;" },
  { label: 'Occupied Slots', query: "SELECT id, zone, current_plate, entry_time FROM parking_slots WHERE status = 'occupied';" },
  { label: 'Slot Count by Location', query: "SELECT location_id, COUNT(*) as total, SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) as free FROM parking_slots GROUP BY location_id;" },
  { label: 'Recent Transactions', query: "SELECT * FROM transactions ORDER BY exit_time DESC LIMIT 20;" },
  { label: 'Revenue by Location', query: "SELECT location_id, SUM(amount) as revenue, COUNT(*) as trips FROM transactions GROUP BY location_id;" },
  { label: 'All Customers', query: "SELECT * FROM customers ORDER BY name;" },
  { label: 'JOIN: Customer + Payments', query: "SELECT c.name, c.plate_number, p.amount, p.method, p.status FROM customers c INNER JOIN payments p ON c.id = p.customer_id;" },
  { label: 'JOIN: Vehicles + Locations', query: "SELECT vl.plate_number, l.name as location, vl.slot_id, vl.entry_time, vl.exit_time, vl.amount FROM vehicle_logs vl JOIN locations l ON vl.location_id = l.id;" },
  { label: 'AVG Amount by Location', query: "SELECT location_id, AVG(amount) as avg_amount, COUNT(*) as total_visits FROM vehicle_logs GROUP BY location_id;" },
  { label: 'Revenue by Payment Method', query: "SELECT method, SUM(amount) as total, COUNT(*) as count FROM payments GROUP BY method;" },
  { label: 'Customer Visit History', query: "SELECT c.name, c.membership, COUNT(vl.id) as visits, SUM(vl.amount) as total_spent FROM customers c LEFT JOIN vehicle_logs vl ON c.plate_number = vl.plate_number GROUP BY c.id, c.name, c.membership;" },
  { label: 'CURSOR: Iterate Slots', query: "DECLARE slot_cursor CURSOR FOR SELECT id, zone, status FROM parking_slots WHERE location_id = 'tech-park'; OPEN slot_cursor; FETCH ALL FROM slot_cursor; CLOSE slot_cursor;" },
  { label: 'TRIGGER: Audit Log', query: "-- Show trigger audit log\nSELECT * FROM audit_log ORDER BY triggered_at DESC;" },
  { label: 'VIP Customers', query: "SELECT name, plate_number, phone, email FROM customers WHERE membership = 'vip';" },
  { label: 'MAX Duration per Location', query: "SELECT location_id, MAX(duration_minutes) as max_duration, MIN(duration_minutes) as min_duration FROM vehicle_logs GROUP BY location_id;" },
];

export default function Admin() {
  const navigate = useNavigate();
  const {
    selectedLocation, selectLocation, slots, locationSlots,
    availableSlots, occupiedSlots, totalSlots,
    transactions, sqlLog, addSqlLog
  } = useParking();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sqlInput, setSqlInput] = useState('');
  const [queryResults, setQueryResults] = useState<{ columns: string[]; rows: string[][] } | null>(null);
  const [searchPlate, setSearchPlate] = useState('');

  useEffect(() => {
    const isAdmin = sessionStorage.getItem('parkSQL_admin');
    if (!isAdmin) navigate('/admin-login');
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('parkSQL_admin');
    navigate('/admin-login');
  };

  const totalRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalOccupiedAll = slots.filter(s => s.status === 'occupied').length;
  const totalSlotsAll = slots.length;
  const totalAvailableAll = slots.filter(s => s.status === 'available').length;

  // Simulate SQL query execution
  const executeQuery = (query: string) => {
    const q = query.trim().toUpperCase();
    addSqlLog(query);

    if (q.includes('FROM LOCATIONS')) {
      setQueryResults({
        columns: ['id', 'name', 'type', 'address', 'rate_per_hour', 'zones'],
        rows: LOCATIONS.map(l => [l.id, l.name, l.type, l.address, `₹${l.ratePerHour}`, l.zones.join(', ')]),
      });
    } else if (q.includes("STATUS = 'AVAILABLE'") && !q.includes('COUNT')) {
      const avail = slots.filter(s => s.status === 'available').slice(0, 20);
      setQueryResults({
        columns: ['id', 'zone', 'location_id', 'status'],
        rows: avail.map(s => [s.id, s.zone, s.locationId, s.status]),
      });
    } else if (q.includes("STATUS = 'OCCUPIED'")) {
      const occ = slots.filter(s => s.status === 'occupied');
      setQueryResults({
        columns: ['id', 'zone', 'location_id', 'current_plate', 'entry_time'],
        rows: occ.map(s => [s.id, s.zone, s.locationId, s.currentPlate || '', s.entryTime?.toLocaleString() || '']),
      });
    } else if (q.includes('GROUP BY LOCATION_ID') && q.includes('COUNT')) {
      setQueryResults({
        columns: ['location_id', 'total', 'available', 'occupied'],
        rows: LOCATIONS.map(l => {
          const ls = slots.filter(s => s.locationId === l.id);
          const av = ls.filter(s => s.status === 'available').length;
          return [l.id, String(ls.length), String(av), String(ls.length - av)];
        }),
      });
    } else if (q.includes('FROM TRANSACTIONS')) {
      setQueryResults({
        columns: ['plate', 'location', 'slot', 'duration', 'amount', 'exit_time'],
        rows: transactions.slice(0, 20).map(tx => [
          tx.plateNumber, tx.locationId, tx.slotId,
          `${tx.durationMinutes} min`, `₹${tx.amount.toFixed(2)}`, tx.exitTime.toLocaleString()
        ]),
      });
    } else if (q.includes('SUM(AMOUNT)') || q.includes('REVENUE')) {
      const grouped: Record<string, { revenue: number; trips: number }> = {};
      transactions.forEach(tx => {
        if (!grouped[tx.locationId]) grouped[tx.locationId] = { revenue: 0, trips: 0 };
        grouped[tx.locationId].revenue += tx.amount;
        grouped[tx.locationId].trips += 1;
      });
      setQueryResults({
        columns: ['location_id', 'revenue', 'trips'],
        rows: Object.entries(grouped).map(([loc, d]) => [loc, `₹${d.revenue.toFixed(2)}`, String(d.trips)]),
      });
    } else {
      setQueryResults({
        columns: ['result'],
        rows: [['Query executed — 0 rows affected. (Simulated)']],
      });
    }
  };

  const handleRunQuery = () => {
    if (!sqlInput.trim()) return;
    executeQuery(sqlInput);
  };

  const searchResults = useMemo(() => {
    if (!searchPlate.trim()) return [];
    const plate = searchPlate.toUpperCase().trim();
    return slots.filter(s => s.currentPlate?.includes(plate));
  }, [searchPlate, slots]);

  const tabs: { id: AdminTab; label: string; icon: typeof Database }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'slots', label: 'Slot Grid', icon: Layers },
    { id: 'console', label: 'SQL Console', icon: Terminal },
    { id: 'transactions', label: 'Transactions', icon: DollarSign },
  ];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] px-4 py-6">
      <div className="container mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Database className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Admin Console</h1>
            </div>
            <p className="text-sm text-muted-foreground">Full database view with live SQL console</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 text-xs">
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </Button>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ===== OVERVIEW TAB ===== */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* Global Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {[
                  { label: 'Total Slots', value: totalSlotsAll, icon: Database, color: 'text-foreground' },
                  { label: 'Available', value: totalAvailableAll, icon: Activity, color: 'text-success' },
                  { label: 'Occupied', value: totalOccupiedAll, icon: Car, color: 'text-warning' },
                  { label: 'Revenue', value: `₹${totalRevenue.toFixed(0)}`, icon: DollarSign, color: 'text-primary' },
                ].map(stat => (
                  <div key={stat.label} className="glass-panel p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                    </div>
                    <div className={`font-mono text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Vehicle Search */}
              <div className="glass-panel p-5 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Vehicle Lookup</span>
                </div>
                <Input
                  value={searchPlate}
                  onChange={e => setSearchPlate(e.target.value.toUpperCase())}
                  placeholder="Search by plate number (e.g. TN-22)"
                  className="font-mono h-10 bg-background mb-3"
                />
                {searchResults.length > 0 && (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50 bg-background/50">
                          <th className="text-left text-[10px] font-mono text-muted-foreground uppercase p-2">Slot</th>
                          <th className="text-left text-[10px] font-mono text-muted-foreground uppercase p-2">Location</th>
                          <th className="text-left text-[10px] font-mono text-muted-foreground uppercase p-2">Plate</th>
                          <th className="text-left text-[10px] font-mono text-muted-foreground uppercase p-2">Entry Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map(s => (
                          <tr key={`${s.locationId}-${s.id}`} className="border-b border-border/30">
                            <td className="p-2 font-mono text-sm text-foreground">{s.id}</td>
                            <td className="p-2 text-sm text-muted-foreground">{LOCATIONS.find(l => l.id === s.locationId)?.name}</td>
                            <td className="p-2 font-mono text-sm text-warning">{s.currentPlate}</td>
                            <td className="p-2 font-mono text-sm text-muted-foreground tabular-nums">{s.entryTime?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {searchPlate && searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground font-mono">No vehicles found matching "{searchPlate}"</p>
                )}
              </div>

              {/* Per-Location Breakdown */}
              <h3 className="text-sm font-medium text-foreground mb-3">Location Breakdown</h3>
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                {LOCATIONS.map(loc => {
                  const ls = slots.filter(s => s.locationId === loc.id);
                  const av = ls.filter(s => s.status === 'available').length;
                  const occ = ls.length - av;
                  const pct = ls.length > 0 ? Math.round((occ / ls.length) * 100) : 0;
                  return (
                    <div key={loc.id} className="glass-panel p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-medium text-foreground text-sm">{loc.name}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center">
                          <div className="font-mono text-lg font-bold text-success tabular-nums">{av}</div>
                          <div className="text-[9px] text-muted-foreground uppercase">Free</div>
                        </div>
                        <div className="text-center">
                          <div className="font-mono text-lg font-bold text-warning tabular-nums">{occ}</div>
                          <div className="text-[9px] text-muted-foreground uppercase">Used</div>
                        </div>
                        <div className="text-center">
                          <div className="font-mono text-lg font-bold text-foreground tabular-nums">{ls.length}</div>
                          <div className="text-[9px] text-muted-foreground uppercase">Total</div>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-background overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${pct > 80 ? 'bg-destructive' : pct > 50 ? 'bg-warning' : 'bg-success'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-2">
                        ₹{loc.ratePerHour}/hr · Zones: {loc.zones.join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SQL Log (last 10) */}
              <div className="glass-panel p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Recent SQL Queries</span>
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground">{sqlLog.length} total</span>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {sqlLog.slice(0, 15).map(entry => (
                    <div key={entry.id} className="flex gap-3 items-start">
                      <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums whitespace-nowrap mt-0.5">
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                      <span className={`text-xs font-mono break-all ${entry.isNew ? 'text-primary' : 'text-muted-foreground'}`}>
                        {entry.query}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ===== SLOTS TAB ===== */}
          {activeTab === 'slots' && (
            <motion.div key="slots" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* Location Selector */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mr-2">Location:</span>
                {LOCATIONS.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => selectLocation(loc.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                      selectedLocation?.id === loc.id
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {loc.name}
                    </div>
                  </button>
                ))}
              </div>

              {selectedLocation ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {[
                      { label: 'Location', value: selectedLocation.name, color: 'text-primary' },
                      { label: 'Total', value: totalSlots, color: 'text-foreground' },
                      { label: 'Available', value: availableSlots, color: 'text-success' },
                      { label: 'Occupied', value: occupiedSlots, color: 'text-warning' },
                    ].map(stat => (
                      <div key={stat.label} className="glass-panel p-3">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</div>
                        <div className={`font-mono text-xl font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  <SlotGrid />
                </>
              ) : (
                <div className="glass-panel p-12 text-center">
                  <MapPin className="w-8 h-8 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Select a location above to view its parking grid</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ===== SQL CONSOLE TAB ===== */}
          {activeTab === 'console' && (
            <motion.div key="console" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="glass-panel p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Terminal className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">SQL Query Editor</span>
                </div>

                {/* Preset queries */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {PRESET_QUERIES.map(pq => (
                    <button
                      key={pq.label}
                      onClick={() => { setSqlInput(pq.query); executeQuery(pq.query); }}
                      className="px-3 py-1.5 rounded-md text-[11px] font-mono border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      {pq.label}
                    </button>
                  ))}
                </div>

                {/* Input area */}
                <div className="relative mb-4">
                  <textarea
                    value={sqlInput}
                    onChange={e => setSqlInput(e.target.value)}
                    placeholder="Type your SQL query here..."
                    rows={4}
                    className="w-full rounded-lg bg-background border border-border p-4 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleRunQuery();
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">Press Ctrl+Enter to execute</span>
                  <Button size="sm" onClick={handleRunQuery} className="gap-2">
                    <Play className="w-3.5 h-3.5" />
                    Execute
                  </Button>
                </div>
              </div>

              {/* Results */}
              {queryResults && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                    <Table2 className="w-3.5 h-3.5 text-success" />
                    <span className="text-xs font-mono text-success">
                      Query OK — {queryResults.rows.length} row{queryResults.rows.length !== 1 ? 's' : ''} returned
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50 bg-background/50">
                          {queryResults.columns.map(col => (
                            <th key={col} className="text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wider p-3 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResults.rows.map((row, i) => (
                          <tr key={i} className="border-b border-border/30 hover:bg-primary/5 transition-colors">
                            {row.map((cell, j) => (
                              <td key={j} className="p-3 font-mono text-xs text-foreground whitespace-nowrap">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* Live SQL Log */}
              <div className="glass-panel p-4 mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-mono text-muted-foreground">Transaction Log (Live)</span>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {sqlLog.slice(0, 20).map(entry => (
                    <div key={entry.id} className="flex gap-3 items-start">
                      <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums whitespace-nowrap mt-0.5">
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                      <span className={`text-[11px] font-mono break-all ${entry.isNew ? 'text-primary' : 'text-muted-foreground'}`}>
                        {entry.query}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ===== TRANSACTIONS TAB ===== */}
          {activeTab === 'transactions' && (
            <motion.div key="transactions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {transactions.length > 0 ? (
                <div className="glass-panel overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                    <DollarSign className="w-4 h-4 text-warning" />
                    <span className="text-sm font-medium text-foreground">All Transactions</span>
                    <span className="ml-auto text-xs font-mono text-muted-foreground">
                      Total Revenue: <span className="text-warning font-bold">₹{totalRevenue.toFixed(2)}</span>
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50 bg-background/50">
                          {['Plate', 'Location', 'Slot', 'Duration', 'Amount', 'Exit Time'].map(h => (
                            <th key={h} className="text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wider p-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map(tx => (
                          <tr key={tx.id} className="border-b border-border/30 hover:bg-primary/5 transition-colors">
                            <td className="p-3 font-mono text-sm text-foreground">{tx.plateNumber}</td>
                            <td className="p-3 text-sm text-muted-foreground">{LOCATIONS.find(l => l.id === tx.locationId)?.name}</td>
                            <td className="p-3 font-mono text-sm text-muted-foreground">{tx.slotId}</td>
                            <td className="p-3 font-mono text-sm tabular-nums text-muted-foreground">{tx.durationMinutes} min</td>
                            <td className="p-3 font-mono text-sm tabular-nums text-warning">₹{tx.amount.toFixed(2)}</td>
                            <td className="p-3 font-mono text-sm tabular-nums text-muted-foreground">{tx.exitTime.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="glass-panel p-12 text-center">
                  <DollarSign className="w-8 h-8 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No transactions yet</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">Exit a vehicle to generate transaction records</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
