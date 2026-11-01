import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
export default function DataConnectionBanner() {
  const client = useQueryClient();
  const [error, setError] = useState('');
  useEffect(() => client.getQueryCache().subscribe(() => {
    const failed = client.getQueryCache().findAll({ queryKey: ['records'] }).find(q => q.state.status === 'error');
    setError(failed ? 'Não foi possível carregar seus dados. Os totais podem estar incompletos.' : '');
  }), [client]);
  if (!error) return null;
  return <div role="alert" className="sticky top-0 z-50 bg-amber-100 text-amber-950 p-3 text-center text-sm">
    {error} <button className="underline ml-2" onClick={() => client.invalidateQueries({ queryKey: ['records'] })}>Tentar novamente</button>
  </div>;
}
