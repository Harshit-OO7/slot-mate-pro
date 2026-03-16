import { useParking, LOCATIONS } from '@/context/ParkingContext';
import SlotGrid from '@/components/SlotGrid';
import { motion } from 'framer-motion';
import { Database, Activity, DollarSign, MapPin } from 'lucide-react';

export default function Admin() {
  const { selectedLocation, selectLocation, slots, availableSlots, occupiedSlots, totalSlots, transactions } = useParking();

  const totalRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] px-4 py-8">
      <div className="container mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <Database className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Admin — Live Grid</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Real-time view of parking_slots table. Toggle "View Source" to see SQL queries.
          </p>
        </motion.div>

        {/* Location Selector */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-muted-foreground uppercase tracking-wider mr-2">Location:</span>
          {LOCATIONS.map(loc => (
            <button
              key={loc.id}
              onClick={() => selectLocation(loc.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 border ${
                selectedLocation?.id === loc.id
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
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
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
              {[
                { label: 'Location', value: selectedLocation.name, icon: MapPin, color: 'text-primary' },
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
                  <div className={`font-mono text-xl font-bold tabular-nums ${stat.color}`}>
                    {stat.value}
                  </div>
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
      </div>
    </div>
  );
}
