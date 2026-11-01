import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { requireBackend } from '@/api/supabase';
import { useAuth } from '@/lib/AuthContext';
import AuthLayout from '@/components/AuthLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
export default function ResetPassword() {
  const [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const { session, clearRecovery } = useAuth();
  const navigate = useNavigate();
  const submit = async event => {
    event.preventDefault(); setError('');
    if (password !== confirm) { setError('As senhas precisam ser iguais.'); return; }
    setBusy(true);
    try {
      const { error } = await requireBackend().auth.updateUser({ password });
      if (error) throw error;
      clearRecovery(); navigate('/', { replace: true });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <AuthLayout icon={Lock} title="Definir nova senha" subtitle="Abra o link de recuperação neste mesmo navegador.">
    {!session ? <p role="alert">Link expirado ou inválido. Solicite outro em “Esqueci minha senha”.</p> :
      <form onSubmit={submit} className="space-y-4">
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <div><Label htmlFor="password">Nova senha</Label><Input id="password" type="password" minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
        <div><Label htmlFor="confirm">Confirmar senha</Label><Input id="confirm" type="password" minLength={8} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></div>
        <Button disabled={busy} type="submit">Salvar nova senha</Button>
      </form>}
  </AuthLayout>;
}
