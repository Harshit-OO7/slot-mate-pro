import { ParkingSlot } from '@/context/ParkingContext';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

function LiveTimer({ entryTime }: { entryTime: Date }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = Date.now() - entryTime.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [entryTime]);

  return <span className="font-mono tabular-nums text-warning text-lg font-semibold">{elapsed}</span>;
}

export default function SlotCard({ slot, onClick }: { slot: ParkingSlot; onClick?: () => void }) {
  const statusColors = {
    available: 'border-success/20 hover:border-success/40',
    occupied: 'border-warning/20 hover:border-warning/40',
    reserved: 'border-primary/20 hover:border-primary/40',
  };

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      className={`slot-card border cursor-pointer ${statusColors[slot.status]}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="font-mono text-2xl font-bold text-foreground tracking-tight">{slot.id}</span>
        <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ${
          slot.status === 'available' ? 'bg-success/10 text-success' :
          slot.status === 'occupied' ? 'bg-warning/10 text-warning' :
          'bg-primary/10 text-primary'
        }`}>
          {slot.status}
        </span>
      </div>

      {slot.status === 'occupied' && slot.currentPlate && slot.entryTime ? (
        <div className="space-y-2">
          <div className="font-mono text-sm text-muted-foreground">{slot.currentPlate}</div>
          <LiveTimer entryTime={slot.entryTime} />
        </div>
      ) : (
        <div className="text-sm text-muted-foreground/50">Ready</div>
      )}
    </motion.div>
  );
}
