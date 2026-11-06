import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleCheck, Mail } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { hasSignupConfirmationCode, requireBackend } from '@/api/supabase';

export default function EmailConfirmed() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let active = true;
    const verify = async () => {
      const auth = requireBackend().auth;
      const { error } = await auth.initialize();
      const { data, error: sessionError } = await auth.getSession();
      const codeConsumed = !new URLSearchParams(window.location.search).has('code');
      if (active) setStatus(!error && !sessionError && hasSignupConfirmationCode && codeConsumed && data.session?.user.email_confirmed_at ? 'confirmed' : 'failed');
    };
    verify().catch(() => { if (active) setStatus('failed'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (status !== 'confirmed') return;
    const timer = setTimeout(() => navigate('/', { replace: true }), 3000);
    return () => clearTimeout(timer);
  }, [status, navigate]);

  const confirmed = status === 'confirmed';
  return (
    <AuthLayout icon={confirmed ? CircleCheck : Mail}
      title={confirmed ? 'E-mail confirmado!' : status === 'checking' ? 'Verificando seu e-mail' : 'Confirmação indisponível'}
      subtitle="V.A.U.L.T." footer={null}>
      <p role={status === 'failed' ? 'alert' : 'status'} className="mb-4 text-sm text-muted-foreground">
        {confirmed ? 'Você será redirecionado para o painel em 3 segundos.' :
          status === 'checking' ? 'Aguarde enquanto verificamos o link.' :
          'Abra o link no mesmo navegador usado no cadastro. Se você já confirmou o e-mail, entre com sua conta.'}
      </p>
      {status !== 'checking' && <Link replace to={confirmed ? '/' : '/login'} className="text-sm font-medium text-primary">
        {confirmed ? 'Ir para o painel agora' : 'Ir para o login'}
      </Link>}
    </AuthLayout>
  );
}

