import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type SlotStatus = 'available' | 'occupied' | 'reserved';

export interface ParkingLocation {
  id: string;
  name: string;
  type: 'tech-park' | 'airport' | 'railway';
  address: string;
  ratePerHour: number;
  zones: string[];
  slotsPerZone: number;
}

export interface ParkingSlot {
  id: string;
  locationId: string;
  zone: string;
  status: SlotStatus;
  currentPlate: string | null;
  entryTime: Date | null;
}

export interface Transaction {
  id: string;
  locationId: string;
  plateNumber: string;
  slotId: string;
  amount: number;
  durationMinutes: number;
  exitTime: Date;
}

export interface SQLLogEntry {
  id: string;
  query: string;
  timestamp: Date;
  isNew: boolean;
}

export interface UserSession {
  plateNumber: string;
  slotId: string;
  locationId: string;
  entryTime: Date;
}

export const LOCATIONS: ParkingLocation[] = [
  {
    id: 'tech-park',
    name: 'Tech Park',
    type: 'tech-park',
    address: 'OMR, Sholinganallur, Chennai 600119',
    ratePerHour: 40,
    zones: ['A', 'B', 'C', 'D'],
    slotsPerZone: 10,
  },
  {
    id: 'chennai-airport',
    name: 'Chennai Airport',
    type: 'airport',
    address: 'GST Road, Tirusulam, Chennai 600027',
    ratePerHour: 80,
    zones: ['T1', 'T2', 'T3', 'VIP'],
    slotsPerZone: 15,
  },
  {
    id: 'mgr-railway',
    name: 'MGR Railway Station',
    type: 'railway',
    address: 'Park Town, Chennai 600003',
    ratePerHour: 30,
    zones: ['P1', 'P2', 'P3'],
    slotsPerZone: 12,
  },
];

interface ParkingContextType {
  locations: ParkingLocation[];
  selectedLocation: ParkingLocation | null;
  selectLocation: (id: string) => void;
  slots: ParkingSlot[];
  locationSlots: ParkingSlot[];
  transactions: Transaction[];
  sqlLog: SQLLogEntry[];
  activeSession: UserSession | null;
  showSqlOverlay: boolean;
  toggleSqlOverlay: () => void;
  enterParking: (plateNumber: string) => ParkingSlot | null;
  exitParking: (plateNumber: string) => Transaction | null;
  getSlotByPlate: (plateNumber: string) => ParkingSlot | null;
  calculateBill: (entryTime: Date, ratePerHour: number) => { duration: number; amount: number };
  // Computed for selected location
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  ratePerHour: number;
  // Global stats
  globalAvailable: number;
  globalTotal: number;
}

const ParkingContext = createContext<ParkingContextType | null>(null);

function generateAllSlots(): ParkingSlot[] {
  const slots: ParkingSlot[] = [];
  LOCATIONS.forEach(loc => {
    loc.zones.forEach(zone => {
      for (let i = 1; i <= loc.slotsPerZone; i++) {
        slots.push({
          id: `${zone}-${String(i).padStart(2, '0')}`,
          locationId: loc.id,
          zone,
          status: 'available',
          currentPlate: null,
          entryTime: null,
        });
      }
    });
  });

  // Demo occupied slots
  const demoData: { loc: string; plates: string[] }[] = [
    { loc: 'tech-park', plates: ['TN-22-AB-1234', 'KA-01-CD-5678', 'TN-09-EF-9012'] },
    { loc: 'chennai-airport', plates: ['DL-01-GH-3456', 'MH-12-IJ-7890', 'TN-07-KL-2345', 'UP-32-MN-6789', 'GJ-05-OP-0123'] },
    { loc: 'mgr-railway', plates: ['TN-01-QR-4567', 'AP-09-ST-8901'] },
  ];

  demoData.forEach(({ loc, plates }) => {
    const locSlots = slots.filter(s => s.locationId === loc && s.status === 'available');
    plates.forEach((plate, i) => {
      const slot = locSlots[i * 3 + Math.floor(Math.random() * 2)];
      if (slot) {
        slot.status = 'occupied';
        slot.currentPlate = plate;
        slot.entryTime = new Date(Date.now() - Math.random() * 4 * 60 * 60 * 1000);
      }
    });
  });

  return slots;
}

export function ParkingProvider({ children }: { children: React.ReactNode }) {
  const [slots, setSlots] = useState<ParkingSlot[]>(generateAllSlots);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sqlLog, setSqlLog] = useState<SQLLogEntry[]>([]);
  const [activeSession, setActiveSession] = useState<UserSession | null>(null);
  const [showSqlOverlay, setShowSqlOverlay] = useState(false);

  const selectedLocation = LOCATIONS.find(l => l.id === selectedLocationId) || null;
  const locationSlots = selectedLocationId ? slots.filter(s => s.locationId === selectedLocationId) : [];

  const addSqlLog = useCallback((query: string) => {
    const entry: SQLLogEntry = {
      id: crypto.randomUUID(),
      query,
      timestamp: new Date(),
      isNew: true,
    };
    setSqlLog(prev => [entry, ...prev].slice(0, 50));
    setTimeout(() => {
      setSqlLog(prev => prev.map(e => e.id === entry.id ? { ...e, isNew: false } : e));
    }, 2000);
  }, []);

  useEffect(() => {
    addSqlLog("SELECT * FROM locations ORDER BY name;");
    addSqlLog("SELECT COUNT(*) as total, SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) as free FROM parking_slots GROUP BY location_id;");
  }, []);

  const selectLocation = useCallback((id: string) => {
    setSelectedLocationId(id);
    const loc = LOCATIONS.find(l => l.id === id);
    if (loc) {
      addSqlLog(`SELECT * FROM parking_slots WHERE location_id = '${id}' ORDER BY zone, id;`);
      addSqlLog(`SELECT COUNT(*) as available FROM parking_slots WHERE location_id = '${id}' AND status = 'available';`);
    }
  }, [addSqlLog]);

  const totalSlots = locationSlots.length;
  const availableSlots = locationSlots.filter(s => s.status === 'available').length;
  const occupiedSlots = locationSlots.filter(s => s.status === 'occupied').length;
  const globalAvailable = slots.filter(s => s.status === 'available').length;
  const globalTotal = slots.length;

  const enterParking = useCallback((plateNumber: string): ParkingSlot | null => {
    if (!selectedLocation) return null;
    const plate = plateNumber.toUpperCase().trim();

    addSqlLog(`SELECT * FROM parking_slots WHERE location_id = '${selectedLocation.id}' AND status = 'available' ORDER BY zone, id LIMIT 1;`);

    const availableSlot = slots.find(s => s.locationId === selectedLocation.id && s.status === 'available');
    if (!availableSlot) return null;

    const entryTime = new Date();

    setSlots(prev => prev.map(s =>
      s.id === availableSlot.id && s.locationId === selectedLocation.id
        ? { ...s, status: 'occupied' as SlotStatus, currentPlate: plate, entryTime }
        : s
    ));

    addSqlLog(`UPDATE parking_slots SET status = 'occupied', current_plate = '${plate}', entry_time = NOW() WHERE id = '${availableSlot.id}' AND location_id = '${selectedLocation.id}';`);
    addSqlLog(`INSERT INTO active_sessions (plate_number, slot_id, location_id, entry_time) VALUES ('${plate}', '${availableSlot.id}', '${selectedLocation.id}', NOW());`);

    const session: UserSession = { plateNumber: plate, slotId: availableSlot.id, locationId: selectedLocation.id, entryTime };
    setActiveSession(session);

    return { ...availableSlot, status: 'occupied', currentPlate: plate, entryTime };
  }, [slots, selectedLocation, addSqlLog]);

  const calculateBill = useCallback((entryTime: Date, rate: number) => {
    const diffMs = Date.now() - entryTime.getTime();
    const durationMinutes = Math.max(1, Math.ceil(diffMs / 60000));
    const hours = durationMinutes / 60;
    const amount = Math.ceil(hours * rate * 100) / 100;
    return { duration: durationMinutes, amount };
  }, []);

  const exitParking = useCallback((plateNumber: string): Transaction | null => {
    const plate = plateNumber.toUpperCase().trim();

    addSqlLog(`SELECT ps.*, l.rate_per_hour FROM parking_slots ps JOIN locations l ON ps.location_id = l.id WHERE ps.current_plate = '${plate}';`);

    const slot = slots.find(s => s.currentPlate === plate);
    if (!slot || !slot.entryTime) return null;

    const loc = LOCATIONS.find(l => l.id === slot.locationId);
    const rate = loc?.ratePerHour || 50;
    const { duration, amount } = calculateBill(slot.entryTime, rate);

    addSqlLog(`SELECT TIMESTAMPDIFF(MINUTE, entry_time, NOW()) as duration FROM parking_slots WHERE current_plate = '${plate}';`);
    addSqlLog(`-- Calculated: ${duration} mins × ₹${rate}/hr = ₹${amount.toFixed(2)}`);

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      locationId: slot.locationId,
      plateNumber: plate,
      slotId: slot.id,
      amount,
      durationMinutes: duration,
      exitTime: new Date(),
    };

    setSlots(prev => prev.map(s =>
      s.id === slot.id && s.locationId === slot.locationId
        ? { ...s, status: 'available' as SlotStatus, currentPlate: null, entryTime: null }
        : s
    ));

    setTransactions(prev => [transaction, ...prev]);

    addSqlLog(`UPDATE parking_slots SET status = 'available', current_plate = NULL, entry_time = NULL WHERE id = '${slot.id}' AND location_id = '${slot.locationId}';`);
    addSqlLog(`DELETE FROM active_sessions WHERE plate_number = '${plate}';`);
    addSqlLog(`INSERT INTO transactions (plate_number, slot_id, location_id, amount, duration_minutes) VALUES ('${plate}', '${slot.id}', '${slot.locationId}', ${amount.toFixed(2)}, ${duration});`);

    if (activeSession?.plateNumber === plate) {
      setActiveSession(null);
    }

    return transaction;
  }, [slots, calculateBill, activeSession, addSqlLog]);

  const getSlotByPlate = useCallback((plateNumber: string) => {
    return slots.find(s => s.currentPlate === plateNumber.toUpperCase().trim()) || null;
  }, [slots]);

  return (
    <ParkingContext.Provider value={{
      locations: LOCATIONS,
      selectedLocation,
      selectLocation,
      slots, locationSlots, transactions, sqlLog, activeSession,
      ratePerHour: selectedLocation?.ratePerHour || 0,
      totalSlots, availableSlots, occupiedSlots,
      globalAvailable, globalTotal,
      showSqlOverlay, toggleSqlOverlay: () => setShowSqlOverlay(p => !p),
      enterParking, exitParking, getSlotByPlate, calculateBill,
    }}>
      {children}
    </ParkingContext.Provider>
  );
}

export function useParking() {
  const ctx = useContext(ParkingContext);
  if (!ctx) throw new Error('useParking must be used within ParkingProvider');
  return ctx;
}
