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

type PresetCategory = 'Basic' | 'Joins & Aggregates' | 'Cursor & Trigger' | 'Normalization' | 'Transactions (ACID)' | 'Concurrency Control';

const PRESET_QUERIES: { label: string; query: string; category: PresetCategory }[] = [
  // Basic
  { category: 'Basic', label: 'All Locations', query: "SELECT * FROM locations ORDER BY name;" },
  { category: 'Basic', label: 'Available Slots', query: "SELECT id, zone, location_id FROM parking_slots WHERE status = 'available' ORDER BY location_id, zone;" },
  { category: 'Basic', label: 'Occupied Slots', query: "SELECT id, zone, current_plate, entry_time FROM parking_slots WHERE status = 'occupied';" },
  { category: 'Basic', label: 'Slot Count by Location', query: "SELECT location_id, COUNT(*) as total, SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) as free FROM parking_slots GROUP BY location_id;" },
  { category: 'Basic', label: 'Recent Transactions', query: "SELECT * FROM transactions ORDER BY exit_time DESC LIMIT 20;" },
  { category: 'Basic', label: 'All Customers', query: "SELECT * FROM customers ORDER BY name;" },

  // Joins & Aggregates
  { category: 'Joins & Aggregates', label: 'JOIN: Customer + Payments', query: "SELECT c.name, c.plate_number, p.amount, p.method, p.status FROM customers c INNER JOIN payments p ON c.id = p.customer_id;" },
  { category: 'Joins & Aggregates', label: 'JOIN: Vehicles + Locations', query: "SELECT vl.plate_number, l.name as location, vl.slot_id, vl.entry_time, vl.exit_time, vl.amount FROM vehicle_logs vl JOIN locations l ON vl.location_id = l.id;" },
  { category: 'Joins & Aggregates', label: 'AVG Amount by Location', query: "SELECT location_id, AVG(amount) as avg_amount, COUNT(*) as total_visits FROM vehicle_logs GROUP BY location_id;" },
  { category: 'Joins & Aggregates', label: 'Revenue by Payment Method', query: "SELECT method, SUM(amount) as total, COUNT(*) as count FROM payments GROUP BY method;" },
  { category: 'Joins & Aggregates', label: 'Customer Visit History', query: "SELECT c.name, c.membership, COUNT(vl.id) as visits, SUM(vl.amount) as total_spent FROM customers c LEFT JOIN vehicle_logs vl ON c.plate_number = vl.plate_number GROUP BY c.id, c.name, c.membership;" },
  { category: 'Joins & Aggregates', label: 'Revenue by Location', query: "SELECT location_id, SUM(amount) as revenue, COUNT(*) as trips FROM transactions GROUP BY location_id;" },
  { category: 'Joins & Aggregates', label: 'VIP Customers', query: "SELECT name, plate_number, phone, email FROM customers WHERE membership = 'vip';" },
  { category: 'Joins & Aggregates', label: 'MAX Duration per Location', query: "SELECT location_id, MAX(duration_minutes) as max_duration, MIN(duration_minutes) as min_duration FROM vehicle_logs GROUP BY location_id;" },

  // Cursor & Trigger
  { category: 'Cursor & Trigger', label: 'CURSOR: Iterate Slots', query: "DECLARE slot_cursor CURSOR FOR SELECT id, zone, status FROM parking_slots WHERE location_id = 'tech-park'; OPEN slot_cursor; FETCH ALL FROM slot_cursor; CLOSE slot_cursor;" },
  { category: 'Cursor & Trigger', label: 'TRIGGER: Audit Log', query: "-- Show trigger audit log\nSELECT * FROM audit_log ORDER BY triggered_at DESC;" },

  // === NORMALIZATION ===
  { category: 'Normalization', label: '⚠️ UNF: Unnormalized', query: "-- UNNORMALIZED FORM (UNF): All data in a single flat table with repeating groups\nSELECT * FROM parking_unnormalized;" },
  { category: 'Normalization', label: '1NF: Atomic Values', query: "-- 1NF: Eliminate repeating groups, ensure atomic values\n-- Split multi-valued 'zones' into separate rows\nSELECT * FROM locations_1nf;" },
  { category: 'Normalization', label: '2NF: Remove Partial Deps', query: "-- 2NF: Remove partial dependencies on composite keys\n-- customer_name depends only on customer_id, not (customer_id, transaction_id)\nSELECT * FROM transactions_2nf_analysis;" },
  { category: 'Normalization', label: '3NF: Remove Transitive Deps', query: "-- 3NF: Remove transitive dependencies\n-- location_address depends on location_id, not on the primary key directly\nSELECT * FROM transactions_3nf_analysis;" },
  { category: 'Normalization', label: '4NF: Multi-Valued Deps', query: "-- 4NF: Eliminate multi-valued dependencies\n-- A customer can have multiple vehicles AND multiple payment methods independently\nSELECT * FROM customer_4nf_analysis;" },
  { category: 'Normalization', label: '5NF: Join Dependencies', query: "-- 5NF (PJNF): Eliminate join dependencies\n-- Decompose so no spurious tuples on natural join\nSELECT * FROM booking_5nf_analysis;" },
  { category: 'Normalization', label: 'Anomalies Demo', query: "-- Demonstrate INSERT, UPDATE, DELETE anomalies in unnormalized data\nSELECT * FROM anomalies_demo;" },

  // === TRANSACTION MANAGEMENT (ACID) ===
  { category: 'Transactions (ACID)', label: 'ACID: Atomicity', query: "-- ATOMICITY: All or nothing\nBEGIN TRANSACTION;\nUPDATE parking_slots SET status='occupied', current_plate='TN-99-ZZ-0001' WHERE id='A-01';\nINSERT INTO vehicle_logs VALUES ('VL099','TN-99-ZZ-0001','tech-park','A-01', NOW(), NULL, NULL, NULL);\nINSERT INTO payments VALUES ('PAY099','TXN099','C001', 0, 'upi', 'pending', NOW());\nCOMMIT;\n-- If any statement fails, ALL are rolled back" },
  { category: 'Transactions (ACID)', label: 'ACID: Consistency', query: "-- CONSISTENCY: DB moves from one valid state to another\nBEGIN TRANSACTION;\nUPDATE parking_slots SET status='occupied' WHERE id='B-03' AND status='available';\n-- CHECK constraint: slot count never exceeds capacity\n-- FOREIGN KEY: customer_id must exist in customers table\nCOMMIT;\n-- Constraints enforced: CHECK, UNIQUE, FK, NOT NULL" },
  { category: 'Transactions (ACID)', label: 'ACID: Isolation', query: "-- ISOLATION: Concurrent transactions don't interfere\n-- Transaction T1: Customer parks in A-01\nBEGIN TRANSACTION; -- T1\nSELECT * FROM parking_slots WHERE id='A-01' FOR UPDATE; -- Lock row\nUPDATE parking_slots SET status='occupied' WHERE id='A-01';\n-- Transaction T2 (concurrent): Also tries A-01\n-- T2 BLOCKS here until T1 commits\nCOMMIT; -- T1\n-- Now T2 sees updated status and picks another slot" },
  { category: 'Transactions (ACID)', label: 'ACID: Durability', query: "-- DURABILITY: Committed data survives crashes\nBEGIN TRANSACTION;\nINSERT INTO transactions VALUES ('TX999','TN-22-AB-1234','tech-park','A-01',120,80.00,NOW());\nCOMMIT;\n-- Write-Ahead Log (WAL) ensures this persists\n-- Even if server crashes after COMMIT, data is recoverable\nSELECT * FROM transaction_durability_demo;" },
  { category: 'Transactions (ACID)', label: 'ROLLBACK Demo', query: "-- ROLLBACK: Undo all changes in failed transaction\nBEGIN TRANSACTION;\nUPDATE parking_slots SET status='occupied' WHERE id='A-02';\nINSERT INTO vehicle_logs VALUES ('VL100','INVALID-PLATE','tech-park','A-02', NOW(), NULL, NULL, NULL);\n-- ERROR: plate format violates CHECK constraint!\nROLLBACK;\n-- All changes undone — slot A-02 remains available" },
  { category: 'Transactions (ACID)', label: 'SAVEPOINT Demo', query: "-- SAVEPOINT: Partial rollback within a transaction\nBEGIN TRANSACTION;\nUPDATE parking_slots SET status='occupied' WHERE id='A-03';\nSAVEPOINT sp1;\nINSERT INTO payments VALUES ('PAY100','TXN100','C001', 100, 'upi', 'pending', NOW());\n-- Oops, wrong amount!\nROLLBACK TO SAVEPOINT sp1;\n-- Slot update preserved, payment rolled back\nINSERT INTO payments VALUES ('PAY100','TXN100','C001', 80, 'upi', 'completed', NOW());\nCOMMIT;" },

  // === CONCURRENCY CONTROL ===
  { category: 'Concurrency Control', label: 'Shared Lock (S-Lock)', query: "-- SHARED LOCK: Multiple transactions can READ simultaneously\n-- T1: Reads slot availability\nBEGIN; SELECT * FROM parking_slots WHERE location_id='tech-park' LOCK IN SHARE MODE;\n-- T2: Also reads (ALLOWED — shared lock is compatible)\nBEGIN; SELECT * FROM parking_slots WHERE location_id='tech-park' LOCK IN SHARE MODE;\n-- T3: Tries to UPDATE (BLOCKED — exclusive lock needed)\nSELECT * FROM lock_compatibility_matrix;" },
  { category: 'Concurrency Control', label: 'Exclusive Lock (X-Lock)', query: "-- EXCLUSIVE LOCK: Only one transaction can WRITE\nBEGIN TRANSACTION;\nSELECT * FROM parking_slots WHERE id='A-01' FOR UPDATE; -- X-Lock acquired\nUPDATE parking_slots SET status='occupied' WHERE id='A-01';\n-- Other transactions cannot read or write this row\nCOMMIT; -- Lock released\nSELECT * FROM lock_demo_exclusive;" },
  { category: 'Concurrency Control', label: 'Deadlock Scenario', query: "-- DEADLOCK: Two transactions waiting on each other\n-- T1: Locks A-01, then needs A-02\nBEGIN; UPDATE parking_slots SET status='occupied' WHERE id='A-01'; -- T1 locks A-01\n-- T2: Locks A-02, then needs A-01\nBEGIN; UPDATE parking_slots SET status='occupied' WHERE id='A-02'; -- T2 locks A-02\n-- T1: UPDATE ... WHERE id='A-02'; -- BLOCKED (T2 holds lock)\n-- T2: UPDATE ... WHERE id='A-01'; -- BLOCKED (T1 holds lock)\n-- DEADLOCK DETECTED! One transaction is rolled back\nSELECT * FROM deadlock_demo;" },
  { category: 'Concurrency Control', label: '2PL Protocol', query: "-- TWO-PHASE LOCKING (2PL): Guarantees serializability\n-- GROWING PHASE: Acquire locks, never release\nBEGIN;\nSELECT * FROM parking_slots WHERE id='A-01' FOR UPDATE; -- Acquire X-Lock\nSELECT * FROM customers WHERE id='C001' LOCK IN SHARE MODE; -- Acquire S-Lock\n-- SHRINKING PHASE: Release locks, never acquire\nUPDATE parking_slots SET current_plate='TN-22-AB-1234' WHERE id='A-01';\nCOMMIT; -- All locks released\nSELECT * FROM two_phase_locking_demo;" },
  { category: 'Concurrency Control', label: 'Isolation Levels', query: "-- ISOLATION LEVELS comparison\n-- READ UNCOMMITTED: Dirty reads possible\n-- READ COMMITTED: No dirty reads (default in PostgreSQL)\n-- REPEATABLE READ: No non-repeatable reads\n-- SERIALIZABLE: Full isolation, no phantom reads\nSET TRANSACTION ISOLATION LEVEL SERIALIZABLE;\nSELECT * FROM isolation_levels_demo;" },
  { category: 'Concurrency Control', label: 'Lost Update Problem', query: "-- LOST UPDATE: Two transactions overwrite each other\n-- T1 reads balance=1000, T2 reads balance=1000\n-- T1 sets balance=1000-200=800\n-- T2 sets balance=1000-300=700 (T1's update LOST!)\n-- SOLUTION: Use SELECT ... FOR UPDATE\nSELECT * FROM lost_update_demo;" },
];

const PRESET_CATEGORIES: PresetCategory[] = ['Basic', 'Joins & Aggregates', 'Cursor & Trigger', 'Normalization', 'Transactions (ACID)', 'Concurrency Control'];

export default function Admin() {
  const navigate = useNavigate();
  const {
    selectedLocation, selectLocation, slots, locationSlots,
    availableSlots, occupiedSlots, totalSlots,
    transactions, sqlLog, addSqlLog
  } = useParking();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sqlInput, setSqlInput] = useState('');
  const [queryResults, setQueryResults] = useState<{ columns: string[]; rows: string[][]; note?: string } | null>(null);
  const [searchPlate, setSearchPlate] = useState('');
  const [activePresetCategory, setActivePresetCategory] = useState<PresetCategory>('Basic');

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

  // Simulate SQL query execution with sample data support
  const executeQuery = (query: string) => {
    const q = query.trim().toUpperCase();
    addSqlLog(query);

    // ===== NORMALIZATION =====
    if (q.includes('PARKING_UNNORMALIZED')) {
      addSqlLog('-- Showing UNNORMALIZED form: repeating groups, multi-valued attributes');
      setQueryResults({
        columns: ['txn_id', 'customer_name', 'phone', 'plate_numbers', 'location', 'address', 'zones', 'slot', 'amount', 'method'],
        rows: [
          ['TXN001', 'Rahul Sharma', '9876543210', 'TN-22-AB-1234, TN-22-XY-5678', 'SRM Tech Park', 'SRM IST, Kattankulathur', 'A, B, C', 'A-01', '₹120', 'upi'],
          ['TXN002', 'Priya Nair', '9812345678', 'KA-01-CD-5678', 'Chennai Airport', 'GST Road, Chennai', 'T1, T2, T3, VIP', 'T1-02', '₹240', 'card'],
          ['TXN003', 'Arjun Menon', '9898765432', 'TN-09-EF-9012, TN-09-AB-0001', 'MGR Railway', 'Central, Chennai', 'P1, P2, P3', 'P1-04', '₹90', 'cash'],
          ['TXN004', 'Rahul Sharma', '9876543210', 'TN-22-AB-1234, TN-22-XY-5678', 'Chennai Airport', 'GST Road, Chennai', 'T1, T2, T3, VIP', 'T1-05', '₹200', 'upi'],
        ],
        note: '⚠️ PROBLEMS: Repeating groups (plate_numbers, zones), redundant data (customer info repeated), multi-valued attributes violate 1NF.'
      });
      return;
    }

    if (q.includes('LOCATIONS_1NF')) {
      addSqlLog('-- 1NF: Atomic values only, no repeating groups');
      setQueryResults({
        columns: ['location_id', 'name', 'address', 'rate_per_hour', 'zone'],
        rows: [
          ['tech-park', 'SRM Tech Park', 'SRM IST, Kattankulathur', '₹40', 'A'],
          ['tech-park', 'SRM Tech Park', 'SRM IST, Kattankulathur', '₹40', 'B'],
          ['tech-park', 'SRM Tech Park', 'SRM IST, Kattankulathur', '₹40', 'C'],
          ['chennai-airport', 'Chennai Airport', 'GST Road, Chennai', '₹80', 'T1'],
          ['chennai-airport', 'Chennai Airport', 'GST Road, Chennai', '₹80', 'T2'],
          ['chennai-airport', 'Chennai Airport', 'GST Road, Chennai', '₹80', 'T3'],
          ['chennai-airport', 'Chennai Airport', 'GST Road, Chennai', '₹80', 'VIP'],
          ['mgr-railway', 'MGR Railway Station', 'Central, Chennai', '₹30', 'P1'],
          ['mgr-railway', 'MGR Railway Station', 'Central, Chennai', '₹30', 'P2'],
          ['mgr-railway', 'MGR Railway Station', 'Central, Chennai', '₹30', 'P3'],
        ],
        note: '✅ 1NF achieved: Each cell has atomic (single) values. Zones split into individual rows. But redundancy remains (name, address repeated).'
      });
      return;
    }

    if (q.includes('TRANSACTIONS_2NF')) {
      addSqlLog('-- 2NF: Remove partial dependencies on composite key (customer_id, transaction_id)');
      setQueryResults({
        columns: ['analysis', 'table', 'columns', 'dependency'],
        rows: [
          ['BEFORE (1NF)', 'transactions_flat', 'txn_id, customer_id, customer_name, phone, plate, location_id, loc_name, slot, amount', 'Composite PK: (txn_id, customer_id)'],
          ['❌ Partial Dep', 'transactions_flat', 'customer_name, phone, plate', 'Depends ONLY on customer_id, NOT full PK'],
          ['AFTER (2NF) — Table 1', 'customers', 'customer_id → name, phone, plate_number, membership', 'Full functional dependency'],
          ['AFTER (2NF) — Table 2', 'transactions', 'txn_id → customer_id, location_id, slot_id, amount, time', 'Full functional dependency'],
          ['AFTER (2NF) — Table 3', 'payments', 'payment_id → txn_id, amount, method, status', 'Full functional dependency'],
        ],
        note: '✅ 2NF: Split into customers, transactions, payments. No non-key attribute depends on part of a composite key.'
      });
      return;
    }

    if (q.includes('TRANSACTIONS_3NF')) {
      addSqlLog('-- 3NF: Remove transitive dependencies (non-key → non-key)');
      setQueryResults({
        columns: ['analysis', 'table', 'dependency_chain', 'issue'],
        rows: [
          ['BEFORE', 'transactions_2nf', 'txn_id → location_id → location_name, address, rate', 'Transitive: txn_id → location_id → address'],
          ['❌ Transitive Dep', '—', 'location_name depends on location_id, NOT on txn_id', 'UPDATE anomaly: changing address requires updating ALL txns'],
          ['AFTER (3NF) — Table 1', 'locations', 'location_id → name, address, rate_per_hour', 'Direct dependency only'],
          ['AFTER (3NF) — Table 2', 'transactions', 'txn_id → customer_id, location_id, slot_id, amount', 'No transitive deps'],
          ['AFTER (3NF) — Table 3', 'parking_slots', 'slot_id → location_id, zone, status', 'No transitive deps'],
          ['RESULT', 'All tables', 'Every non-key attribute depends on the key, the whole key, and nothing but the key', '✅ Codd\'s rule satisfied'],
        ],
        note: '✅ 3NF: No transitive dependencies. "Every non-key attribute must depend on the key, the whole key, and nothing but the key."'
      });
      return;
    }

    if (q.includes('CUSTOMER_4NF')) {
      addSqlLog('-- 4NF: Eliminate multi-valued dependencies');
      setQueryResults({
        columns: ['analysis', 'table', 'columns', 'issue'],
        rows: [
          ['BEFORE', 'customer_vehicles_payments', 'customer_id, vehicle_plate, payment_method', 'MVD: customer →→ vehicle AND customer →→ payment_method'],
          ['❌ Problem', '—', 'C001 owns 2 cars, uses 3 payment methods', 'Must store 2×3 = 6 rows (Cartesian product!)'],
          ['Sample row', '—', 'C001, TN-22-AB-1234, upi', ''],
          ['Sample row', '—', 'C001, TN-22-AB-1234, card', ''],
          ['Sample row', '—', 'C001, TN-22-XY-5678, upi', 'Redundant combinations'],
          ['Sample row', '—', 'C001, TN-22-XY-5678, card', 'Redundant combinations'],
          ['AFTER (4NF) — Table 1', 'customer_vehicles', 'customer_id, plate_number', 'Independent MVD separated'],
          ['AFTER (4NF) — Table 2', 'customer_payment_methods', 'customer_id, payment_method', 'Independent MVD separated'],
        ],
        note: '✅ 4NF: Multi-valued dependencies separated into independent tables. No more Cartesian product redundancy.'
      });
      return;
    }

    if (q.includes('BOOKING_5NF')) {
      addSqlLog('-- 5NF (PJNF): Eliminate join dependencies');
      setQueryResults({
        columns: ['analysis', 'table', 'columns', 'explanation'],
        rows: [
          ['BEFORE', 'bookings', 'customer_id, location_id, slot_type', 'Ternary relationship'],
          ['Rule 1', '—', 'Rahul can park at SRM Tech Park', 'Customer ↔ Location'],
          ['Rule 2', '—', 'SRM Tech Park has Zone-A slots', 'Location ↔ Slot Type'],
          ['Rule 3', '—', 'Rahul prefers Zone-A', 'Customer ↔ Slot Type'],
          ['❌ Problem', '—', 'Cannot decompose into 2 tables without losing info', 'Join dependency exists'],
          ['AFTER (5NF) — T1', 'customer_location', 'customer_id, location_id', 'Who parks where'],
          ['AFTER (5NF) — T2', 'location_slot_types', 'location_id, slot_type', 'What slots exist where'],
          ['AFTER (5NF) — T3', 'customer_preferences', 'customer_id, slot_type', 'What type customer prefers'],
          ['VERIFY', 'T1 ⨝ T2 ⨝ T3', 'Natural join recovers original', '✅ No spurious tuples'],
        ],
        note: '✅ 5NF: All join dependencies are implied by candidate keys. Lossless decomposition into 3 projections.'
      });
      return;
    }

    if (q.includes('ANOMALIES_DEMO')) {
      addSqlLog('-- Demonstrating INSERT, UPDATE, DELETE anomalies');
      setQueryResults({
        columns: ['anomaly_type', 'scenario', 'problem', 'solution'],
        rows: [
          ['INSERT', 'Add new location "Forum Mall"', 'Cannot insert location without a transaction/customer', 'Separate locations table (Normalization)'],
          ['INSERT', 'Add customer C011 with no visits', 'Forced to insert NULL for slot, amount, location', 'Separate customers table'],
          ['UPDATE', 'SRM Tech Park changes address', 'Must update ALL rows with that location', 'Single row in locations table (3NF)'],
          ['UPDATE', 'Customer C001 changes phone number', 'Must find and update every transaction row', 'Separate customers table (2NF)'],
          ['DELETE', 'Delete only transaction TXN003', 'Lose Arjun Menon\'s customer info if it\'s his only record', 'Separate customers table'],
          ['DELETE', 'Remove all MGR Railway transactions', 'Lose the location info (name, address, rate)', 'Separate locations table (3NF)'],
        ],
        note: '⚠️ Anomalies occur in unnormalized/partially normalized data. Proper normalization (2NF, 3NF) eliminates these issues.'
      });
      return;
    }

    // ===== TRANSACTION MANAGEMENT (ACID) =====
    if (q.includes('ATOMICITY') && (q.includes('BEGIN') || q.includes('COMMIT'))) {
      addSqlLog('BEGIN TRANSACTION;');
      addSqlLog('  → UPDATE parking_slots SET status=\'occupied\' WHERE id=\'A-01\'; ✓');
      addSqlLog('  → INSERT INTO vehicle_logs ... ✓');
      addSqlLog('  → INSERT INTO payments ... ✓');
      addSqlLog('COMMIT; -- All 3 operations applied atomically');
      setQueryResults({
        columns: ['step', 'operation', 'status', 'explanation'],
        rows: [
          ['1', 'BEGIN TRANSACTION', '✅ Started', 'Transaction boundary opened'],
          ['2', 'UPDATE parking_slots', '✅ Executed', 'Slot A-01 marked occupied (not yet visible to others)'],
          ['3', 'INSERT vehicle_logs', '✅ Executed', 'Vehicle entry recorded in buffer'],
          ['4', 'INSERT payments', '✅ Executed', 'Payment record created in buffer'],
          ['5', 'COMMIT', '✅ Committed', 'ALL 3 changes now permanent and visible'],
          ['—', 'If step 4 FAILED:', '❌ ROLLBACK', 'Steps 2 & 3 would ALSO be undone — ALL or NOTHING'],
        ],
        note: '⚛️ ATOMICITY: A transaction is an indivisible unit. Either ALL operations succeed (COMMIT) or NONE do (ROLLBACK).'
      });
      return;
    }

    if (q.includes('CONSISTENCY') && q.includes('BEGIN')) {
      addSqlLog('-- Checking constraints before COMMIT...');
      setQueryResults({
        columns: ['constraint_type', 'rule', 'example', 'status'],
        rows: [
          ['CHECK', 'amount >= 0', 'Payment of ₹-50 rejected', '✅ Enforced'],
          ['NOT NULL', 'plate_number IS NOT NULL', 'Empty plate rejected', '✅ Enforced'],
          ['UNIQUE', 'UNIQUE(slot_id, location_id) when occupied', 'Two cars in same slot rejected', '✅ Enforced'],
          ['FOREIGN KEY', 'customer_id REFERENCES customers(id)', 'Invalid customer C999 rejected', '✅ Enforced'],
          ['DOMAIN', 'status IN (available, occupied, reserved)', 'status=\'broken\' rejected', '✅ Enforced'],
          ['BUSINESS', 'occupied_count <= total_capacity', 'Overbooking prevented', '✅ Enforced'],
        ],
        note: '🔒 CONSISTENCY: DB transitions from one valid state to another. All constraints must hold before and after the transaction.'
      });
      return;
    }

    if (q.includes('ISOLATION') && q.includes('FOR UPDATE')) {
      addSqlLog('-- T1: SELECT ... FOR UPDATE on A-01 (lock acquired)');
      addSqlLog('-- T2: SELECT ... FOR UPDATE on A-01 (BLOCKED, waiting for T1)');
      addSqlLog('-- T1: COMMIT → lock released → T2 proceeds');
      setQueryResults({
        columns: ['time', 'T1 (Customer A)', 'T2 (Customer B)', 'slot A-01 state'],
        rows: [
          ['t0', 'BEGIN', '—', 'available'],
          ['t1', 'SELECT A-01 FOR UPDATE 🔒', '—', 'locked by T1'],
          ['t2', 'UPDATE → occupied', 'BEGIN', 'occupied (uncommitted)'],
          ['t3', '—', 'SELECT A-01 FOR UPDATE ⏳', 'T2 BLOCKED'],
          ['t4', 'COMMIT ✅', '—', 'occupied (committed)'],
          ['t5', '—', 'Lock acquired → sees occupied', 'T2 picks A-02 instead'],
          ['t6', '—', 'UPDATE A-02 → COMMIT ✅', 'Both parked safely'],
        ],
        note: '🔀 ISOLATION: Concurrent transactions don\'t interfere. T2 waits until T1 finishes, preventing double-booking.'
      });
      return;
    }

    if (q.includes('DURABILITY') && q.includes('TRANSACTION_DURABILITY')) {
      addSqlLog('-- WAL: Write-Ahead Log ensures durability');
      setQueryResults({
        columns: ['phase', 'action', 'WAL_state', 'disk_state'],
        rows: [
          ['1. Execute', 'INSERT transaction TX999', 'Written to WAL ✅', 'Not yet on disk'],
          ['2. Commit', 'COMMIT', 'Commit record in WAL ✅', 'Not yet on disk'],
          ['3. Acknowledge', 'Client receives "OK"', 'WAL flushed to disk ✅', 'Pending checkpoint'],
          ['⚡ CRASH', 'Server crashes here!', 'WAL survives on disk', 'Data pages lost'],
          ['4. Recovery', 'Server restarts', 'Replays WAL ✅', 'Data restored from WAL'],
          ['5. Verified', 'SELECT * FROM transactions', '—', 'TX999 present ✅'],
        ],
        note: '💾 DURABILITY: Once COMMIT returns success, the data is guaranteed to survive crashes. Write-Ahead Logging (WAL) makes this possible.'
      });
      return;
    }

    if (q.includes('ROLLBACK') && !q.includes('SAVEPOINT') && q.includes('BEGIN')) {
      addSqlLog('BEGIN TRANSACTION;');
      addSqlLog('  → UPDATE parking_slots ... ✓');
      addSqlLog('  → INSERT vehicle_logs ... ✗ CHECK constraint violation!');
      addSqlLog('ROLLBACK; -- All changes undone');
      setQueryResults({
        columns: ['step', 'operation', 'status', 'data_state'],
        rows: [
          ['1', 'BEGIN TRANSACTION', '✅', 'Snapshot taken'],
          ['2', 'UPDATE slots SET occupied WHERE A-02', '✅ (pending)', 'A-02 → occupied (uncommitted)'],
          ['3', 'INSERT vehicle_logs (INVALID-PLATE)', '❌ ERROR', 'CHECK constraint: plate format invalid'],
          ['4', 'ROLLBACK', '↩️ Undone', 'A-02 → available (restored)'],
          ['—', 'Final state of A-02', '✅ available', 'As if nothing happened'],
        ],
        note: '↩️ ROLLBACK: On error, all changes within the transaction are undone. The database returns to its state before BEGIN.'
      });
      return;
    }

    if (q.includes('SAVEPOINT')) {
      addSqlLog('BEGIN; UPDATE slot; SAVEPOINT sp1; INSERT (wrong); ROLLBACK TO sp1; INSERT (correct); COMMIT;');
      setQueryResults({
        columns: ['step', 'operation', 'status', 'savepoint_stack'],
        rows: [
          ['1', 'BEGIN TRANSACTION', '✅', '[]'],
          ['2', 'UPDATE slots A-03 → occupied', '✅ (pending)', '[]'],
          ['3', 'SAVEPOINT sp1', '📌 Created', '[sp1]'],
          ['4', 'INSERT payment ₹100 (wrong amt)', '✅ (pending)', '[sp1]'],
          ['5', 'ROLLBACK TO SAVEPOINT sp1', '↩️ Partial undo', '[sp1] — payment undone, slot update kept'],
          ['6', 'INSERT payment ₹80 (correct)', '✅ (pending)', '[sp1]'],
          ['7', 'COMMIT', '✅ All done', 'Slot occupied + correct payment saved'],
        ],
        note: '📌 SAVEPOINT: Allows partial rollback within a transaction. Only undo back to the savepoint, keeping earlier work.'
      });
      return;
    }

    // ===== CONCURRENCY CONTROL =====
    if (q.includes('LOCK_COMPATIBILITY_MATRIX') || q.includes('LOCK IN SHARE MODE')) {
      addSqlLog('-- Lock compatibility matrix for Shared (S) and Exclusive (X) locks');
      setQueryResults({
        columns: ['Lock Requested →', 'S-Lock Held', 'X-Lock Held', 'No Lock'],
        rows: [
          ['S-Lock (Read)', '✅ Compatible', '❌ Blocked', '✅ Granted'],
          ['X-Lock (Write)', '❌ Blocked', '❌ Blocked', '✅ Granted'],
          ['No Lock', '✅ —', '✅ —', '✅ —'],
        ],
        note: '🔐 S-Lock (Shared): Multiple readers allowed. X-Lock (Exclusive): Only one writer, blocks all others.'
      });
      return;
    }

    if (q.includes('LOCK_DEMO_EXCLUSIVE')) {
      addSqlLog('-- X-Lock acquired on row A-01');
      setQueryResults({
        columns: ['time', 'T1 (Writer)', 'T2 (Reader)', 'T3 (Writer)', 'A-01 lock'],
        rows: [
          ['t0', 'BEGIN', '—', '—', 'None'],
          ['t1', 'SELECT A-01 FOR UPDATE', '—', '—', '🔒 X-Lock (T1)'],
          ['t2', 'UPDATE status=occupied', 'SELECT A-01 ⏳ BLOCKED', '—', '🔒 X-Lock (T1)'],
          ['t3', '—', '⏳ waiting...', 'UPDATE A-01 ⏳ BLOCKED', '🔒 X-Lock (T1)'],
          ['t4', 'COMMIT ✅', '—', '—', '🔓 Released'],
          ['t5', '—', 'Reads: occupied ✅', 'Acquires X-Lock', '🔒 X-Lock (T3)'],
        ],
        note: '🔒 EXCLUSIVE LOCK: Blocks both reads and writes from other transactions until released by COMMIT/ROLLBACK.'
      });
      return;
    }

    if (q.includes('DEADLOCK_DEMO')) {
      addSqlLog('-- ⚠️ DEADLOCK detected between T1 and T2!');
      setQueryResults({
        columns: ['time', 'T1', 'T2', 'locks_held'],
        rows: [
          ['t0', 'BEGIN', 'BEGIN', '—'],
          ['t1', 'UPDATE A-01 🔒', '—', 'T1→A-01'],
          ['t2', '—', 'UPDATE A-02 🔒', 'T1→A-01, T2→A-02'],
          ['t3', 'UPDATE A-02 ⏳ BLOCKED', '—', 'T1 waits for T2'],
          ['t4', '—', 'UPDATE A-01 ⏳ BLOCKED', 'T2 waits for T1'],
          ['t5', '💀 DEADLOCK!', '💀 DEADLOCK!', 'Circular wait detected'],
          ['t6', '❌ ROLLBACK (victim)', 'COMMIT ✅', 'T1 sacrificed, T2 proceeds'],
          ['t7', 'Retries transaction', '—', 'Application handles retry'],
        ],
        note: '💀 DEADLOCK: Circular wait between transactions. DBMS detects it and rolls back one transaction (the "victim").'
      });
      return;
    }

    if (q.includes('TWO_PHASE_LOCKING')) {
      addSqlLog('-- 2PL: Growing phase → Shrinking phase');
      setQueryResults({
        columns: ['phase', 'action', 'locks_held', 'rule'],
        rows: [
          ['GROWING ↑', 'Acquire X-Lock on parking_slots(A-01)', '{X:A-01}', 'Can acquire new locks'],
          ['GROWING ↑', 'Acquire S-Lock on customers(C001)', '{X:A-01, S:C001}', 'Can acquire new locks'],
          ['GROWING ↑', 'Acquire X-Lock on vehicle_logs', '{X:A-01, S:C001, X:v_logs}', 'Peak — all locks held'],
          ['—', '═══ LOCK POINT ═══', '3 locks held', 'No more acquisitions allowed'],
          ['SHRINKING ↓', 'UPDATE A-01, release X-Lock', '{S:C001, X:v_logs}', 'Can only release now'],
          ['SHRINKING ↓', 'Read C001, release S-Lock', '{X:v_logs}', 'Cannot acquire new locks'],
          ['SHRINKING ↓', 'INSERT log, COMMIT', '{}', 'All locks released'],
        ],
        note: '📐 2PL guarantees SERIALIZABILITY: Growing phase (acquire locks) → Lock Point → Shrinking phase (release locks). Never acquire after releasing.'
      });
      return;
    }

    if (q.includes('ISOLATION_LEVELS_DEMO') || q.includes('ISOLATION LEVEL')) {
      addSqlLog('-- Comparing SQL isolation levels');
      setQueryResults({
        columns: ['isolation_level', 'dirty_read', 'non_repeatable_read', 'phantom_read', 'performance'],
        rows: [
          ['READ UNCOMMITTED', '✅ Possible', '✅ Possible', '✅ Possible', '⚡ Fastest'],
          ['READ COMMITTED', '❌ Prevented', '✅ Possible', '✅ Possible', '🔄 Default (PostgreSQL)'],
          ['REPEATABLE READ', '❌ Prevented', '❌ Prevented', '✅ Possible', '🔒 Slower'],
          ['SERIALIZABLE', '❌ Prevented', '❌ Prevented', '❌ Prevented', '🐌 Slowest'],
        ],
        note: '📊 Higher isolation = fewer anomalies but worse performance. PostgreSQL defaults to READ COMMITTED. Use SERIALIZABLE for critical financial operations.'
      });
      return;
    }

    if (q.includes('LOST_UPDATE_DEMO')) {
      addSqlLog('-- Lost update problem demonstration');
      setQueryResults({
        columns: ['time', 'T1 (Pay ₹200)', 'T2 (Pay ₹300)', 'balance', 'issue'],
        rows: [
          ['t0', '—', '—', '₹1000', 'Initial'],
          ['t1', 'READ balance=1000', '—', '₹1000', ''],
          ['t2', '—', 'READ balance=1000', '₹1000', 'Both read same value'],
          ['t3', 'WRITE balance=1000-200=800', '—', '₹800', ''],
          ['t4', '—', 'WRITE balance=1000-300=700', '₹700', '⚠️ T1\'s update LOST!'],
          ['—', '═══ SOLUTION ═══', '', '', ''],
          ['t1\'', 'SELECT balance FOR UPDATE 🔒', '—', '₹1000', 'X-Lock acquired'],
          ['t2\'', '—', 'SELECT balance FOR UPDATE ⏳', '₹1000', 'T2 BLOCKED'],
          ['t3\'', 'WRITE 800, COMMIT', '—', '₹800', 'T1 done'],
          ['t4\'', '—', 'READ 800, WRITE 800-300=500', '₹500', '✅ Correct!'],
        ],
        note: '⚠️ LOST UPDATE: Without locking, concurrent writes overwrite each other. SELECT ... FOR UPDATE prevents this.'
      });
      return;
    }

    // --- CURSOR simulation ---
    if (q.includes('CURSOR') || q.includes('FETCH ALL')) {
      const locMatch = query.match(/location_id\s*=\s*'([^']+)'/i);
      const locId = locMatch ? locMatch[1] : 'tech-park';
      const cursorSlots = slots.filter(s => s.locationId === locId).slice(0, 15);
      addSqlLog(`-- CURSOR opened: slot_cursor`);
      addSqlLog(`-- FETCH ALL: ${cursorSlots.length} rows fetched`);
      addSqlLog(`-- CURSOR closed: slot_cursor`);
      setQueryResults({
        columns: ['cursor_row', 'id', 'zone', 'status', 'current_plate'],
        rows: cursorSlots.map((s, i) => [String(i + 1), s.id, s.zone, s.status, s.currentPlate || 'NULL']),
      });
      return;
    }

    // --- TRIGGER / Audit log ---
    if (q.includes('AUDIT_LOG') || q.includes('TRIGGER')) {
      addSqlLog(`-- Showing audit_log entries from trigger: trg_parking_audit`);
      setQueryResults({
        columns: ['id', 'table_name', 'operation', 'old_value', 'new_value', 'triggered_at'],
        rows: SAMPLE_AUDIT_LOGS.map(a => [a.id, a.table_name, a.operation, a.old_value, a.new_value, a.triggered_at]),
      });
      return;
    }

    // --- JOIN: customers + payments ---
    if (q.includes('JOIN') && q.includes('CUSTOMERS') && q.includes('PAYMENTS')) {
      addSqlLog(`-- Executing INNER JOIN: customers ⨝ payments ON customers.id = payments.customer_id`);
      const joined = SAMPLE_PAYMENTS.map(p => {
        const c = SAMPLE_CUSTOMERS.find(c => c.id === p.customer_id);
        return c ? [c.name, c.plate_number, `₹${p.amount.toFixed(2)}`, p.method, p.status, p.paid_at] : null;
      }).filter(Boolean) as string[][];
      setQueryResults({
        columns: ['name', 'plate_number', 'amount', 'method', 'payment_status', 'paid_at'],
        rows: joined,
      });
      return;
    }

    // --- JOIN: vehicle_logs + locations ---
    if (q.includes('JOIN') && q.includes('VEHICLE_LOGS') && q.includes('LOCATIONS')) {
      addSqlLog(`-- Executing JOIN: vehicle_logs ⨝ locations ON vehicle_logs.location_id = locations.id`);
      const joined = SAMPLE_VEHICLE_LOGS.map(vl => {
        const loc = LOCATIONS.find(l => l.id === vl.location_id);
        return [vl.plate_number, loc?.name || vl.location_id, vl.slot_id, vl.entry_time, vl.exit_time || 'Still parked', `₹${(vl.amount || 0).toFixed(2)}`];
      });
      setQueryResults({
        columns: ['plate_number', 'location', 'slot_id', 'entry_time', 'exit_time', 'amount'],
        rows: joined,
      });
      return;
    }

    // --- LEFT JOIN: customers + vehicle_logs (visit history) ---
    if (q.includes('LEFT JOIN') && q.includes('CUSTOMERS') && q.includes('VEHICLE_LOGS')) {
      addSqlLog(`-- Executing LEFT JOIN: customers ⟕ vehicle_logs ON plate_number`);
      const result = SAMPLE_CUSTOMERS.map(c => {
        const visits = SAMPLE_VEHICLE_LOGS.filter(vl => vl.plate_number === c.plate_number);
        const totalSpent = visits.reduce((sum, vl) => sum + (vl.amount || 0), 0);
        return [c.name, c.membership, String(visits.length), `₹${totalSpent.toFixed(2)}`];
      });
      setQueryResults({
        columns: ['name', 'membership', 'visits', 'total_spent'],
        rows: result,
      });
      return;
    }

    // --- GROUP BY on vehicle_logs (AVG, COUNT) ---
    if (q.includes('VEHICLE_LOGS') && q.includes('GROUP BY') && (q.includes('AVG') || q.includes('COUNT'))) {
      const grouped: Record<string, { total: number; count: number }> = {};
      SAMPLE_VEHICLE_LOGS.forEach(vl => {
        if (!grouped[vl.location_id]) grouped[vl.location_id] = { total: 0, count: 0 };
        grouped[vl.location_id].total += vl.amount || 0;
        grouped[vl.location_id].count += 1;
      });
      setQueryResults({
        columns: ['location_id', 'avg_amount', 'total_visits'],
        rows: Object.entries(grouped).map(([loc, d]) => [loc, `₹${(d.total / d.count).toFixed(2)}`, String(d.count)]),
      });
      return;
    }

    // --- MAX/MIN duration ---
    if (q.includes('VEHICLE_LOGS') && (q.includes('MAX') || q.includes('MIN'))) {
      const grouped: Record<string, { max: number; min: number }> = {};
      SAMPLE_VEHICLE_LOGS.forEach(vl => {
        const dur = vl.duration_minutes || 0;
        if (!grouped[vl.location_id]) grouped[vl.location_id] = { max: dur, min: dur };
        grouped[vl.location_id].max = Math.max(grouped[vl.location_id].max, dur);
        grouped[vl.location_id].min = Math.min(grouped[vl.location_id].min, dur);
      });
      setQueryResults({
        columns: ['location_id', 'max_duration_min', 'min_duration_min'],
        rows: Object.entries(grouped).map(([loc, d]) => [loc, String(d.max), String(d.min)]),
      });
      return;
    }

    // --- GROUP BY on payments ---
    if (q.includes('PAYMENTS') && q.includes('GROUP BY')) {
      const grouped: Record<string, { total: number; count: number }> = {};
      SAMPLE_PAYMENTS.forEach(p => {
        if (!grouped[p.method]) grouped[p.method] = { total: 0, count: 0 };
        grouped[p.method].total += p.amount;
        grouped[p.method].count += 1;
      });
      setQueryResults({
        columns: ['method', 'total_revenue', 'count'],
        rows: Object.entries(grouped).map(([m, d]) => [m, `₹${d.total.toFixed(2)}`, String(d.count)]),
      });
      return;
    }

    // --- SELECT * FROM customers ---
    if (q.includes('FROM CUSTOMERS') && !q.includes('JOIN')) {
      if (q.includes("MEMBERSHIP = 'VIP'") || q.includes("MEMBERSHIP='VIP'")) {
        const vips = SAMPLE_CUSTOMERS.filter(c => c.membership === 'vip');
        setQueryResults({
          columns: ['name', 'plate_number', 'phone', 'email', 'membership'],
          rows: vips.map(c => [c.name, c.plate_number, c.phone, c.email, c.membership]),
        });
      } else {
        setQueryResults({
          columns: ['id', 'name', 'phone', 'email', 'plate_number', 'membership', 'registered_on'],
          rows: SAMPLE_CUSTOMERS.map(c => [c.id, c.name, c.phone, c.email, c.plate_number, c.membership, c.registered_on]),
        });
      }
      return;
    }

    // --- SELECT * FROM payments ---
    if (q.includes('FROM PAYMENTS') && !q.includes('JOIN') && !q.includes('GROUP BY')) {
      setQueryResults({
        columns: ['id', 'transaction_id', 'customer_id', 'amount', 'method', 'status', 'paid_at'],
        rows: SAMPLE_PAYMENTS.map(p => [p.id, p.transaction_id, p.customer_id, `₹${p.amount.toFixed(2)}`, p.method, p.status, p.paid_at]),
      });
      return;
    }

    // --- SELECT * FROM vehicle_logs ---
    if (q.includes('FROM VEHICLE_LOGS') && !q.includes('JOIN') && !q.includes('GROUP BY') && !q.includes('MAX') && !q.includes('MIN')) {
      setQueryResults({
        columns: ['id', 'plate_number', 'location_id', 'slot_id', 'entry_time', 'exit_time', 'duration_min', 'amount'],
        rows: SAMPLE_VEHICLE_LOGS.map(vl => [vl.id, vl.plate_number, vl.location_id, vl.slot_id, vl.entry_time, vl.exit_time || 'NULL', String(vl.duration_minutes || 'NULL'), `₹${(vl.amount || 0).toFixed(2)}`]),
      });
      return;
    }

    // --- Original queries below ---
    if (q.includes('FROM LOCATIONS') && !q.includes('JOIN')) {
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
    } else if (q.includes('GROUP BY LOCATION_ID') && q.includes('COUNT') && q.includes('PARKING_SLOTS')) {
      setQueryResults({
        columns: ['location_id', 'total', 'available', 'occupied'],
        rows: LOCATIONS.map(l => {
          const ls = slots.filter(s => s.locationId === l.id);
          const av = ls.filter(s => s.status === 'available').length;
          return [l.id, String(ls.length), String(av), String(ls.length - av)];
        }),
      });
    } else if (q.includes('FROM TRANSACTIONS') && !q.includes('GROUP BY')) {
      const allTx = [...transactions];
      setQueryResults({
        columns: ['plate', 'location', 'slot', 'duration', 'amount', 'exit_time'],
        rows: allTx.slice(0, 20).map(tx => [
          tx.plateNumber, tx.locationId, tx.slotId,
          `${tx.durationMinutes} min`, `₹${tx.amount.toFixed(2)}`, tx.exitTime.toLocaleString()
        ]),
      });
    } else if (q.includes('SUM(AMOUNT)') || (q.includes('REVENUE') && q.includes('TRANSACTIONS'))) {
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

                {/* Preset category tabs */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {PRESET_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActivePresetCategory(cat)}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all border ${
                        activePresetCategory === cat
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Preset queries for active category */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {PRESET_QUERIES.filter(pq => pq.category === activePresetCategory).map(pq => (
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
                  {queryResults.note && (
                    <div className="px-4 py-3 border-t border-border/50 bg-primary/5">
                      <p className="text-xs font-mono text-primary leading-relaxed">{queryResults.note}</p>
                    </div>
                  )}
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
