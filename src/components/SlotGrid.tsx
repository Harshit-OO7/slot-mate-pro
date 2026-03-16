import { useParking, ParkingSlot } from '@/context/ParkingContext';
import SlotCard from './SlotCard';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { X } from 'lucide-react';

export default function SlotGrid() {
  const { locationSlots } = useParking();
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [filterZone, setFilterZone] = useState<string | null>(null);

  const zones = [...new Set(locationSlots.map(s => s.zone))];
  const filtered = filterZone ? locationSlots.filter(s => s.zone === filterZone) : locationSlots;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setFilterZone(null)}
          className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
            !filterZone ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All Zones
        </button>
        {zones.map(zone => (
          <button
            key={zone}
            onClick={() => setFilterZone(zone)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              filterZone === zone ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Zone {zone}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <AnimatePresence>
          {filtered.map(slot => (
            <SlotCard key={slot.id} slot={slot} onClick={() => setSelectedSlot(slot)} />
          ))}
        </AnimatePresence>
      </div>

      {/* Slide-over detail panel */}
      <AnimatePresence>
        {selectedSlot && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 z-40"
              onClick={() => setSelectedSlot(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 border-l border-border bg-card p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-mono text-4xl font-bold text-foreground">{selectedSlot.id}</span>
                <button onClick={() => setSelectedSlot(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <DetailRow label="Zone" value={`Zone ${selectedSlot.zone}`} />
                <DetailRow label="Status" value={selectedSlot.status} className={
                  selectedSlot.status === 'available' ? 'text-success' :
                  selectedSlot.status === 'occupied' ? 'text-warning' : 'text-primary'
                } />
                {selectedSlot.currentPlate && (
                  <DetailRow label="Plate Number" value={selectedSlot.currentPlate} mono />
                )}
                {selectedSlot.entryTime && (
                  <DetailRow label="Entry Time" value={selectedSlot.entryTime.toLocaleString()} mono />
                )}
              </div>

              <div className="mt-8 p-3 rounded-lg bg-background border border-border">
                <div className="text-[10px] font-mono text-muted-foreground/50 mb-1">Last SQL Action</div>
                <div className="text-xs font-mono text-muted-foreground">
                  SELECT * FROM parking_slots WHERE id = '{selectedSlot.id}';
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ label, value, mono, className }: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${mono ? 'font-mono' : ''} ${className || 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}
