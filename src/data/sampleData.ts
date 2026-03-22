// Background sample data for SQL console demonstrations
// This data exists purely for JOIN, aggregate, cursor, and trigger query simulations

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  plate_number: string;
  membership: 'basic' | 'premium' | 'vip';
  registered_on: string;
}

export interface Payment {
  id: string;
  transaction_id: string;
  customer_id: string;
  amount: number;
  method: 'cash' | 'upi' | 'card' | 'wallet';
  status: 'completed' | 'pending' | 'failed';
  paid_at: string;
}

export interface VehicleLog {
  id: string;
  plate_number: string;
  location_id: string;
  slot_id: string;
  entry_time: string;
  exit_time: string | null;
  duration_minutes: number | null;
  amount: number | null;
}

export interface AuditLog {
  id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_value: string;
  new_value: string;
  triggered_at: string;
}

export const SAMPLE_CUSTOMERS: Customer[] = [
  { id: 'C001', name: 'Rahul Sharma', phone: '9876543210', email: 'rahul@gmail.com', plate_number: 'TN-22-AB-1234', membership: 'premium', registered_on: '2024-08-15' },
  { id: 'C002', name: 'Priya Nair', phone: '9812345678', email: 'priya.nair@yahoo.com', plate_number: 'KA-01-CD-5678', membership: 'basic', registered_on: '2024-09-02' },
  { id: 'C003', name: 'Arjun Menon', phone: '9898765432', email: 'arjun.m@outlook.com', plate_number: 'TN-09-EF-9012', membership: 'vip', registered_on: '2024-06-20' },
  { id: 'C004', name: 'Deepa Krishnan', phone: '9845612378', email: 'deepa.k@gmail.com', plate_number: 'DL-01-GH-3456', membership: 'premium', registered_on: '2024-10-01' },
  { id: 'C005', name: 'Vikram Singh', phone: '9765432180', email: 'vikram.s@hotmail.com', plate_number: 'MH-12-IJ-7890', membership: 'basic', registered_on: '2024-11-10' },
  { id: 'C006', name: 'Ananya Reddy', phone: '9654321098', email: 'ananya.r@gmail.com', plate_number: 'TN-07-KL-2345', membership: 'vip', registered_on: '2024-07-04' },
  { id: 'C007', name: 'Karthik Rajan', phone: '9543210987', email: 'karthik.r@gmail.com', plate_number: 'UP-32-MN-6789', membership: 'basic', registered_on: '2025-01-15' },
  { id: 'C008', name: 'Sneha Iyer', phone: '9432109876', email: 'sneha.i@yahoo.com', plate_number: 'GJ-05-OP-0123', membership: 'premium', registered_on: '2024-12-22' },
  { id: 'C009', name: 'Manoj Kumar', phone: '9321098765', email: 'manoj.k@gmail.com', plate_number: 'TN-01-QR-4567', membership: 'basic', registered_on: '2025-02-08' },
  { id: 'C010', name: 'Lakshmi Devi', phone: '9210987654', email: 'lakshmi.d@outlook.com', plate_number: 'AP-09-ST-8901', membership: 'vip', registered_on: '2024-05-30' },
];

export const SAMPLE_PAYMENTS: Payment[] = [
  { id: 'PAY001', transaction_id: 'TXN001', customer_id: 'C001', amount: 120.00, method: 'upi', status: 'completed', paid_at: '2025-03-20 10:30:00' },
  { id: 'PAY002', transaction_id: 'TXN002', customer_id: 'C003', amount: 80.00, method: 'card', status: 'completed', paid_at: '2025-03-20 11:15:00' },
  { id: 'PAY003', transaction_id: 'TXN003', customer_id: 'C004', amount: 240.00, method: 'wallet', status: 'completed', paid_at: '2025-03-20 14:00:00' },
  { id: 'PAY004', transaction_id: 'TXN004', customer_id: 'C005', amount: 160.00, method: 'cash', status: 'completed', paid_at: '2025-03-21 09:00:00' },
  { id: 'PAY005', transaction_id: 'TXN005', customer_id: 'C006', amount: 200.00, method: 'upi', status: 'completed', paid_at: '2025-03-21 12:45:00' },
  { id: 'PAY006', transaction_id: 'TXN006', customer_id: 'C002', amount: 60.00, method: 'card', status: 'pending', paid_at: '2025-03-21 16:20:00' },
  { id: 'PAY007', transaction_id: 'TXN007', customer_id: 'C007', amount: 90.00, method: 'upi', status: 'completed', paid_at: '2025-03-22 08:10:00' },
  { id: 'PAY008', transaction_id: 'TXN008', customer_id: 'C008', amount: 320.00, method: 'card', status: 'completed', paid_at: '2025-03-22 10:55:00' },
  { id: 'PAY009', transaction_id: 'TXN009', customer_id: 'C009', amount: 45.00, method: 'cash', status: 'failed', paid_at: '2025-03-22 13:30:00' },
  { id: 'PAY010', transaction_id: 'TXN010', customer_id: 'C010', amount: 150.00, method: 'wallet', status: 'completed', paid_at: '2025-03-22 15:00:00' },
  { id: 'PAY011', transaction_id: 'TXN011', customer_id: 'C001', amount: 200.00, method: 'upi', status: 'completed', paid_at: '2025-03-19 09:00:00' },
  { id: 'PAY012', transaction_id: 'TXN012', customer_id: 'C003', amount: 160.00, method: 'card', status: 'completed', paid_at: '2025-03-18 14:30:00' },
];

export const SAMPLE_VEHICLE_LOGS: VehicleLog[] = [
  { id: 'VL001', plate_number: 'TN-22-AB-1234', location_id: 'tech-park', slot_id: 'A-01', entry_time: '2025-03-20 08:00', exit_time: '2025-03-20 11:00', duration_minutes: 180, amount: 120.00 },
  { id: 'VL002', plate_number: 'KA-01-CD-5678', location_id: 'tech-park', slot_id: 'B-03', entry_time: '2025-03-20 09:30', exit_time: '2025-03-20 12:30', duration_minutes: 180, amount: 120.00 },
  { id: 'VL003', plate_number: 'TN-09-EF-9012', location_id: 'tech-park', slot_id: 'A-05', entry_time: '2025-03-20 10:00', exit_time: '2025-03-20 12:00', duration_minutes: 120, amount: 80.00 },
  { id: 'VL004', plate_number: 'DL-01-GH-3456', location_id: 'chennai-airport', slot_id: 'T1-02', entry_time: '2025-03-20 06:00', exit_time: '2025-03-20 09:00', duration_minutes: 180, amount: 240.00 },
  { id: 'VL005', plate_number: 'MH-12-IJ-7890', location_id: 'chennai-airport', slot_id: 'T2-07', entry_time: '2025-03-21 07:00', exit_time: '2025-03-21 09:00', duration_minutes: 120, amount: 160.00 },
  { id: 'VL006', plate_number: 'TN-07-KL-2345', location_id: 'chennai-airport', slot_id: 'VIP-01', entry_time: '2025-03-21 10:00', exit_time: '2025-03-21 12:30', duration_minutes: 150, amount: 200.00 },
  { id: 'VL007', plate_number: 'UP-32-MN-6789', location_id: 'mgr-railway', slot_id: 'P1-04', entry_time: '2025-03-22 08:00', exit_time: '2025-03-22 11:00', duration_minutes: 180, amount: 90.00 },
  { id: 'VL008', plate_number: 'GJ-05-OP-0123', location_id: 'chennai-airport', slot_id: 'T3-10', entry_time: '2025-03-22 05:30', exit_time: '2025-03-22 09:30', duration_minutes: 240, amount: 320.00 },
  { id: 'VL009', plate_number: 'TN-01-QR-4567', location_id: 'mgr-railway', slot_id: 'P2-01', entry_time: '2025-03-22 12:00', exit_time: '2025-03-22 13:30', duration_minutes: 90, amount: 45.00 },
  { id: 'VL010', plate_number: 'AP-09-ST-8901', location_id: 'mgr-railway', slot_id: 'P3-06', entry_time: '2025-03-22 09:00', exit_time: '2025-03-22 14:00', duration_minutes: 300, amount: 150.00 },
  { id: 'VL011', plate_number: 'TN-22-AB-1234', location_id: 'chennai-airport', slot_id: 'T1-05', entry_time: '2025-03-19 07:00', exit_time: '2025-03-19 09:30', duration_minutes: 150, amount: 200.00 },
  { id: 'VL012', plate_number: 'TN-09-EF-9012', location_id: 'mgr-railway', slot_id: 'P1-02', entry_time: '2025-03-18 11:00', exit_time: '2025-03-18 16:20', duration_minutes: 320, amount: 160.00 },
];

export const SAMPLE_AUDIT_LOGS: AuditLog[] = [
  { id: 'AUD001', table_name: 'parking_slots', operation: 'UPDATE', old_value: "status='available'", new_value: "status='occupied', plate='TN-22-AB-1234'", triggered_at: '2025-03-22 08:00:01' },
  { id: 'AUD002', table_name: 'active_sessions', operation: 'INSERT', old_value: 'NULL', new_value: "plate='TN-22-AB-1234', slot='A-01'", triggered_at: '2025-03-22 08:00:02' },
  { id: 'AUD003', table_name: 'parking_slots', operation: 'UPDATE', old_value: "status='occupied'", new_value: "status='available', plate=NULL", triggered_at: '2025-03-22 11:00:01' },
  { id: 'AUD004', table_name: 'transactions', operation: 'INSERT', old_value: 'NULL', new_value: "plate='TN-22-AB-1234', amount=120.00", triggered_at: '2025-03-22 11:00:02' },
  { id: 'AUD005', table_name: 'payments', operation: 'INSERT', old_value: 'NULL', new_value: "amount=120.00, method='upi'", triggered_at: '2025-03-22 11:00:03' },
  { id: 'AUD006', table_name: 'customers', operation: 'UPDATE', old_value: "membership='basic'", new_value: "membership='premium'", triggered_at: '2025-03-21 16:00:00' },
  { id: 'AUD007', table_name: 'parking_slots', operation: 'UPDATE', old_value: "status='available'", new_value: "status='occupied', plate='DL-01-GH-3456'", triggered_at: '2025-03-20 06:00:01' },
  { id: 'AUD008', table_name: 'vehicle_logs', operation: 'INSERT', old_value: 'NULL', new_value: "plate='DL-01-GH-3456', location='chennai-airport'", triggered_at: '2025-03-20 06:00:02' },
];
