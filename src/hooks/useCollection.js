import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { vault, DATA_CHANGED } from '@/api/vaultClient';
import { supabase } from '@/api/supabase';
import { useAuth } from '@/lib/AuthContext';

export default function useCollection(entityName, sort = '-date') {
  const { user } = useAuth();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['records', user?.id, entityName, sort],
    queryFn: () => vault.entities[entityName].list(sort),
    enabled: Boolean(user),
    refetchOnWindowFocus: true,
  });
  const reload = useCallback(() => client.invalidateQueries({
    queryKey: ['records', user?.id, entityName],
  }), [client, user?.id, entityName]);
  useEffect(() => {
    if (!user || !supabase) return;
    const onChange = event => { if (event.detail === entityName) reload(); };
    window.addEventListener(DATA_CHANGED, onChange);
    const channel = supabase.channel('records:' + user.id + ':' + entityName + ':' + crypto.randomUUID())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vault_records', filter: 'user_id=eq.' + user.id },
        () => reload()).subscribe();
    return () => { window.removeEventListener(DATA_CHANGED, onChange); supabase.removeChannel(channel); };
  }, [user?.id, entityName, reload]);
  return { items: query.data ?? [], loading: query.isPending, error: query.error, reload };
}
