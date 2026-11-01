import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Module-level cache: persists across page navigations so we don't refetch
// the same entity every time a page mounts.
const cache = {};
// Tracks in-flight requests so multiple components mounting the same entity
// at the same time share a single API call.
const inflight = {};

// Active listeners per entity: each is a setItems function. Notified when a
// realtime event merges a new/updated/deleted record into the cache.
const listeners = {};
// One realtime subscription per entity, created lazily and kept for the session.
const subscriptions = {};

// Simple concurrency throttle: limits how many API calls fire simultaneously,
// preventing "Rate limit exceeded" errors when a page uses many collections.
const queue = [];
let active = 0;
const MAX_CONCURRENT = 4;

function runThrottled(fn) {
  return new Promise((resolve, reject) => {
    const exec = () => {
      active++;
      Promise.resolve()
        .then(fn)
        .then(resolve, reject)
        .finally(() => { active--; drain(); });
    };
    queue.push(exec);
    drain();
  });
}

function drain() {
  while (active < MAX_CONCURRENT && queue.length) queue.shift()();
}

// Merge a realtime event into the cached array and notify every active listener.
function applyEvent(entityName, event) {
  const current = cache[entityName] ? [...cache[entityName]] : [];
  const idx = current.findIndex((r) => r.id === event.id);
  if (event.type === 'delete') {
    if (idx >= 0) current.splice(idx, 1);
  } else if (event.type === 'update') {
    if (idx >= 0) current[idx] = { ...current[idx], ...event.data };
    else current.push(event.data);
  } else if (event.type === 'create') {
    if (idx < 0) current.push(event.data);
  }
  cache[entityName] = current;
  const subs = listeners[entityName];
  if (subs) subs.forEach((fn) => fn(current));
}

// Ensure a single realtime subscription exists for the entity.
function ensureSubscription(entityName) {
  if (subscriptions[entityName]) return;
  const entity = base44.entities[entityName];
  if (!entity || typeof entity.subscribe !== 'function') return;
  try {
    const unsubscribe = entity.subscribe((event) => applyEvent(entityName, event));
    subscriptions[entityName] = unsubscribe;
  } catch (e) {
    // realtime not available for this entity — fall back to cache + revalidate
  }
}

export default function useCollection(entityName, sort = '-date') {
  const [items, setItems] = useState(cache[entityName] ?? []);
  const [loading, setLoading] = useState(!cache[entityName]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await runThrottled(() =>
        base44.entities[entityName].list(sort, 1000)
      );
      cache[entityName] = data;
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [entityName, sort]);

  useEffect(() => {
    let mounted = true;

    // Serve cached data instantly if available (stale-while-revalidate)
    if (cache[entityName]) {
      setItems(cache[entityName]);
      setLoading(false);
    }

    // Always revalidate in the background to avoid stale data
    if (!inflight[entityName]) {
      inflight[entityName] = runThrottled(() =>
        base44.entities[entityName].list(sort, 1000)
      ).then(data => {
        cache[entityName] = data;
        return data;
      }).finally(() => { delete inflight[entityName]; });
    }

    inflight[entityName]
      .then(data => {
        if (mounted) {
          setItems(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted && !cache[entityName]) setLoading(false);
      });

    // Register as a realtime listener so create/update/delete reflect instantly
    const updater = (data) => { if (mounted) setItems(data); };
    if (!listeners[entityName]) listeners[entityName] = new Set();
    listeners[entityName].add(updater);
    ensureSubscription(entityName);

    return () => {
      mounted = false;
      listeners[entityName]?.delete(updater);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityName, sort]);

  return { items, loading, reload };
}