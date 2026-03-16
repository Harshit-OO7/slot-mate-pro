import { useParking } from '@/context/ParkingContext';
import SlotGrid from '@/components/SlotGrid';
import { motion } from 'framer-motion';
import { Database, Activity, DollarSign } from 'lucide-react';

export default function Admin() {
  const { availableSlots, occupiedSlots, totalSlots, transactions } = useParking();

  const totalRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="container mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <Database className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Admin — Live Grid</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            Real-time view of parking_slots table. Toggle "View Source" to see SQL queries.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total Slots', value: totalSlots, icon: Database, color: 'text-foreground' },
            { label: 'Available', value: availableSlots, icon: Activity, color: 'text-success' },
            { label: 'Occupied', value: occupiedSlots, icon: Activity, color: 'text-warning' },
            { label: 'Revenue', value: `₹${totalRevenue.toFixed(0)}`, icon: DollarSign, color: 'text-primary' },
          ].map(stat => (
            <div key={stat.label} className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className={`font-mono text-2xl font-bold tabular-nums ${stat.color}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <SlotGrid />
      </div>
    </div>
  );
}
