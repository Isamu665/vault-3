import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogIn, UserPlus, Mail, Loader2 } from 'lucide-react';
import { requireBackend, getAuthProviders } from '@/api/supabase';
import { safeReturnTo } from '@/lib/authReturnTo';
import AuthLayout from './AuthLayout';
import GoogleIcon from './GoogleIcon';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export default function AuthForm({ mode = 'login' }) {
  const signup = mode === 'register', forgot = mode === 'forgot';
  const navigate = useNavigate();
  const providers = useQuery({ queryKey: ['auth-providers'], queryFn: getAuthProviders, staleTime: 60000 });
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [name, setName] = useState(''), [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const homeUrl = new URL(import.meta.env.BASE_URL, window.location.origin).href;
  const google = async () => {
    setBusy(true); setError('');
    try {
      const { error } = await requireBackend().auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: new URL(safeReturnTo(), window.location.origin).href },
      });
      if (error) throw error;
    } catch (e) { setError(e.message); setBusy(false); }
  };
  const submit = async event => {
    event.preventDefault(); setError(''); setNotice('');
    if (signup && password !== confirm) { setError('As senhas precisam ser iguais.'); return; }
    setBusy(true);
    try {
      const auth = requireBackend().auth;
      if (forgot) {
        const { error } = await auth.resetPasswordForEmail(email, { redirectTo: homeUrl + 'reset-password' });
        if (error) throw error;
        setNotice('Se houver uma conta para este e-mail, você receberá as instruções de recuperação.');
      } else if (signup) {
        const { data, error } = await auth.signUp({ email, password,
          options: { emailRedirectTo: homeUrl, data: { full_name: name } } });
        if (error) throw error;
        if (data.session) navigate('/', { replace: true });
        else setNotice('Confira seu e-mail e abra o link de confirmação para ativar sua conta.');
      } else {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign(safeReturnTo());
      }
    } catch (e) { setError(e.message || 'Não foi possível continuar.'); }
    finally { setBusy(false); }
  };
  return <AuthLayout icon={forgot ? Mail : signup ? UserPlus : LogIn}
    title={forgot ? 'Recuperar acesso' : signup ? 'Seu próximo passo começa aqui' : 'Bem-vindo ao V.A.U.L.T'}
    subtitle={forgot ? 'Receba um link seguro no seu e-mail.' : 'Suas finanças, suas metas, seu espaço.'}
    footer={<Link className="text-primary" to={signup || forgot ? '/login' : '/register'}>{signup || forgot ? 'Voltar para entrar' : 'Ainda não tem conta? Cadastre-se'}</Link>}>
    {!forgot && <Button onClick={google} disabled={busy || !providers.data?.google} variant="outline" className="w-full h-12 mb-2 gap-3"><GoogleIcon className="w-5 h-5" />Continuar com Google</Button>}
    {!forgot && !providers.isPending && !providers.data?.google && <p className="text-xs text-muted-foreground mb-4">O acesso Google será liberado após a configuração pelo administrador. Você já pode usar e-mail e senha.</p>}
    {!forgot && <p className="text-center text-xs text-muted-foreground mb-5">ou use seu e-mail</p>}
    {error && <p role="alert" className="mb-4 rounded-xl bg-destructive/10 text-destructive p-3 text-sm">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-500/10 p-3 text-sm">{notice}</p>}
    <form onSubmit={submit} className="space-y-4">
      {signup && <div><Label htmlFor="name">Como podemos chamar você?</Label><Input id="name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" maxLength={100} required /></div>}
      <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></div>
      {!forgot && <div><Label htmlFor="password">Senha</Label><Input id="password" type="password" minLength={signup ? 8 : 1} value={password} onChange={e => setPassword(e.target.value)} autoComplete={signup ? 'new-password' : 'current-password'} required /></div>}
      {signup && <div><Label htmlFor="confirm">Confirmar senha</Label><Input id="confirm" type="password" minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required /></div>}
      {!forgot && !signup && <Link className="block text-xs text-primary" to="/forgot-password">Esqueci minha senha</Link>}
      <Button className="w-full h-12" type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin w-4 h-4" /> : forgot ? 'Enviar instruções' : signup ? 'Criar minha conta' : 'Entrar'}</Button>
    </form>
  </AuthLayout>;
}
