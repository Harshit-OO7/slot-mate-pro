import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type SlotStatus = 'available' | 'occupied' | 'reserved';

export interface ParkingSlot {
  id: string;
  zone: string;
  status: SlotStatus;
  currentPlate: string | null;
  entryTime: Date | null;
}

export interface Transaction {
  id: string;
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
  entryTime: Date;
}

interface ParkingContextType {
  slots: ParkingSlot[];
  transactions: Transaction[];
  sqlLog: SQLLogEntry[];
  activeSession: UserSession | null;
  ratePerHour: number;
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  showSqlOverlay: boolean;
  toggleSqlOverlay: () => void;
  enterParking: (plateNumber: string) => ParkingSlot | null;
  exitParking: (plateNumber: string) => Transaction | null;
  getSlotByPlate: (plateNumber: string) => ParkingSlot | null;
  calculateBill: (entryTime: Date) => { duration: number; amount: number };
}

const ParkingContext = createContext<ParkingContextType | null>(null);

const ZONES = ['A', 'B', 'C', 'D'];
const SLOTS_PER_ZONE = 12;
const RATE_PER_HOUR = 50;

function generateSlots(): ParkingSlot[] {
  const slots: ParkingSlot[] = [];
  ZONES.forEach(zone => {
    for (let i = 1; i <= SLOTS_PER_ZONE; i++) {
      const id = `${zone}-${String(i).padStart(2, '0')}`;
      slots.push({
        id,
        zone,
        status: 'available',
        currentPlate: null,
        entryTime: null,
      });
    }
  });
  // Pre-occupy some slots for demo
  const demoPlates = ['MH-12-AB-1234', 'DL-01-CD-5678', 'KA-03-EF-9012', 'TN-07-GH-3456',
    'UP-32-IJ-7890', 'GJ-05-KL-2345', 'RJ-14-MN-6789', 'MP-09-OP-0123'];
  demoPlates.forEach((plate, i) => {
    const slot = slots[i * 5 + Math.floor(Math.random() * 4)];
    if (slot) {
      slot.status = 'occupied';
      slot.currentPlate = plate;
      slot.entryTime = new Date(Date.now() - Math.random() * 4 * 60 * 60 * 1000);
    }
  });
  return slots;
}

export function ParkingProvider({ children }: { children: React.ReactNode }) {
  const [slots, setSlots] = useState<ParkingSlot[]>(generateSlots);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sqlLog, setSqlLog] = useState<SQLLogEntry[]>([]);
  const [activeSession, setActiveSession] = useState<UserSession | null>(null);
  const [showSqlOverlay, setShowSqlOverlay] = useState(false);

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

  // Initial SQL log entries
  useEffect(() => {
    addSqlLog("SELECT * FROM parking_slots ORDER BY zone, id;");
    addSqlLog("SELECT COUNT(*) as available FROM parking_slots WHERE status = 'available';");
  }, []);

  const availableSlots = slots.filter(s => s.status === 'available').length;
  const occupiedSlots = slots.filter(s => s.status === 'occupied').length;

  const enterParking = useCallback((plateNumber: string): ParkingSlot | null => {
    const plate = plateNumber.toUpperCase().trim();
    
    addSqlLog(`SELECT * FROM parking_slots WHERE status = 'available' ORDER BY zone, id LIMIT 1;`);
    
    const availableSlot = slots.find(s => s.status === 'available');
    if (!availableSlot) return null;

    const entryTime = new Date();
    
    setSlots(prev => prev.map(s => 
      s.id === availableSlot.id 
        ? { ...s, status: 'occupied' as SlotStatus, currentPlate: plate, entryTime }
        : s
    ));

    addSqlLog(`UPDATE parking_slots SET status = 'occupied', current_plate = '${plate}', entry_time = NOW() WHERE id = '${availableSlot.id}';`);
    addSqlLog(`INSERT INTO active_sessions (plate_number, slot_id, entry_time) VALUES ('${plate}', '${availableSlot.id}', NOW());`);

    const session: UserSession = { plateNumber: plate, slotId: availableSlot.id, entryTime };
    setActiveSession(session);

    return { ...availableSlot, status: 'occupied', currentPlate: plate, entryTime };
  }, [slots, addSqlLog]);

  const calculateBill = useCallback((entryTime: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - entryTime.getTime();
    const durationMinutes = Math.max(1, Math.ceil(diffMs / 60000));
    const hours = durationMinutes / 60;
    const amount = Math.ceil(hours * RATE_PER_HOUR * 100) / 100;
    return { duration: durationMinutes, amount };
  }, []);

  const exitParking = useCallback((plateNumber: string): Transaction | null => {
    const plate = plateNumber.toUpperCase().trim();
    
    addSqlLog(`SELECT * FROM parking_slots WHERE current_plate = '${plate}';`);
    
    const slot = slots.find(s => s.currentPlate === plate);
    if (!slot || !slot.entryTime) return null;

    const { duration, amount } = calculateBill(slot.entryTime);

    addSqlLog(`SELECT TIMESTAMPDIFF(MINUTE, entry_time, NOW()) as duration FROM parking_slots WHERE current_plate = '${plate}';`);
    addSqlLog(`-- Calculated: ${duration} mins × ₹${RATE_PER_HOUR}/hr = ₹${amount.toFixed(2)}`);

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      plateNumber: plate,
      slotId: slot.id,
      amount,
      durationMinutes: duration,
      exitTime: new Date(),
    };

    setSlots(prev => prev.map(s => 
      s.id === slot.id 
        ? { ...s, status: 'available' as SlotStatus, currentPlate: null, entryTime: null }
        : s
    ));

    setTransactions(prev => [transaction, ...prev]);
    
    addSqlLog(`UPDATE parking_slots SET status = 'available', current_plate = NULL, entry_time = NULL WHERE id = '${slot.id}';`);
    addSqlLog(`DELETE FROM active_sessions WHERE plate_number = '${plate}';`);
    addSqlLog(`INSERT INTO transactions (plate_number, slot_id, amount, duration_minutes, exit_time) VALUES ('${plate}', '${slot.id}', ${amount.toFixed(2)}, ${duration}, NOW());`);

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
      slots, transactions, sqlLog, activeSession,
      ratePerHour: RATE_PER_HOUR,
      totalSlots: slots.length,
      availableSlots, occupiedSlots,
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
