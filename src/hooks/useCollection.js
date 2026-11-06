import { useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { vault, DATA_CHANGED } from '@/api/vaultClient';
import { sortRecords } from '@/api/record-model.mjs';
import { supabase } from '@/api/supabase';
import { useAuth } from '@/lib/AuthContext';

export function useRecordsRealtime(userId) {
  const client = useQueryClient();
  useEffect(() => {
    if (!userId || !supabase) return;
    const invalidate = entity => client.invalidateQueries({
      queryKey: entity ? ['records', userId, entity] : ['records', userId],
    });
    const onChange = event => invalidate(event.detail);
    window.addEventListener(DATA_CHANGED, onChange);
    const channel = supabase.channel('records:' + userId + ':' + crypto.randomUUID())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'vault_records', filter: 'user_id=eq.' + userId,
      }, payload => invalidate(payload.new?.entity || payload.old?.entity)).subscribe();
    return () => {
      window.removeEventListener(DATA_CHANGED, onChange);
      supabase.removeChannel(channel);
    };
  }, [client, userId]);
}

export default function useCollection(entityName, sort = '-date') {
  const { user } = useAuth();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['records', user?.id, entityName],
    queryFn: () => vault.entities[entityName].list(undefined, undefined, undefined, user?.id),
    enabled: Boolean(user),
    refetchOnWindowFocus: true,
  });
  const items = useMemo(() => sortRecords(query.data ?? [], sort), [query.data, sort]);
  const reload = useCallback(() => client.invalidateQueries({
    queryKey: ['records', user?.id, entityName],
  }), [client, user?.id, entityName]);
  return { items, loading: query.isPending, error: query.error, reload };
}
