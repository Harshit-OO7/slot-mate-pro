import { useParking } from '@/context/ParkingContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';

export default function SQLLogPanel() {
  const { sqlLog, showSqlOverlay } = useParking();

  if (!showSqlOverlay) return null;

  return (
    <motion.div
      initial={{ y: 200, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 200, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md"
      style={{ maxHeight: '200px' }}
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
        <Terminal className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-mono text-muted-foreground">SQL Transaction Log</span>
        <span className="ml-auto text-xs font-mono text-muted-foreground">{sqlLog.length} queries</span>
      </div>
      <div className="overflow-y-auto p-4 space-y-1" style={{ maxHeight: '155px' }}>
        <AnimatePresence>
          {sqlLog.map(entry => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3 items-start"
            >
              <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums whitespace-nowrap mt-0.5">
                {entry.timestamp.toLocaleTimeString()}
              </span>
              <span className={`text-xs font-mono ${entry.isNew ? 'text-primary' : 'text-muted-foreground'} transition-colors duration-2000`}>
                {entry.query}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
