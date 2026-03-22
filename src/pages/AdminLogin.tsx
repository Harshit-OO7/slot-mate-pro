import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, ArrowRight, Terminal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (username === ADMIN_USER && password === ADMIN_PASS) {
        sessionStorage.setItem('parkSQL_admin', 'true');
        navigate('/admin');
      } else {
        setError('Invalid credentials. Try admin / admin123');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card/20 to-background" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-warning/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-panel p-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Admin Login</h1>
              <p className="text-xs text-muted-foreground">Access the SQL console & management panel</p>
            </div>
          </div>

          {/* Decorative SQL line */}
          <div className="my-6 p-3 rounded-lg bg-background border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <Terminal className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Authentication Query</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground/70">
              SELECT * FROM admins WHERE username = '<span className="text-primary">{username || '?'}</span>' AND password_hash = hash('<span className="text-warning">{'•'.repeat(password.length) || '?'}</span>');
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 block">Username</label>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                className="font-mono h-12 bg-background border-border focus:border-primary/50"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 block">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="font-mono h-12 bg-background border-border focus:border-primary/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive font-mono p-3 rounded-lg bg-destructive/5 border border-destructive/20"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-sm font-medium shadow-lg shadow-primary/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <>
                  Access Admin Panel
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-[10px] text-muted-foreground/40 text-center mt-6 font-mono">
            Demo: <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">admin</code> / <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">admin123</code>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
