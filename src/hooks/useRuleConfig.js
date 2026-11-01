import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';

const STORAGE_KEY = 'rule_50_30_20_config';

export const DEFAULT_RULE_CONFIG = {
  categories: [
    { key: 'necessidades', label: 'Necessidades', percentage: 50, color: '#3b82f6' },
    { key: 'desejos', label: 'Desejos', percentage: 30, color: '#a855f7' },
    { key: 'patrimonio', label: 'Patrimônio', percentage: 20, color: '#6366f1' },
  ],
};

export default function useRuleConfig() {
  const { user } = useAuth();
  const storageKey = STORAGE_KEY + ':' + user.id;
  const [config, setConfig] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migration: remove subcategories if present in old stored config
        const migrated = {
          categories: (parsed.categories || DEFAULT_RULE_CONFIG.categories).map((c) => ({
            key: c.key === 'potencial_sobra' ? 'patrimonio' : c.key,
            label: c.key === 'potencial_sobra' ? 'Patrimônio' : c.label,
            percentage: c.percentage,
            color: c.color,
          })),
        };
        return migrated;
      }
      return DEFAULT_RULE_CONFIG;
    } catch {
      return DEFAULT_RULE_CONFIG;
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(config));
  }, [config, storageKey]);

  const updatePercentage = useCallback((catKey, percentage) => {
    setConfig((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) =>
        cat.key === catKey
          ? { ...cat, percentage: Math.max(0, Math.min(100, Number(percentage) || 0)) }
          : cat
      ),
    }));
  }, []);

  const resetConfig = useCallback(() => setConfig(DEFAULT_RULE_CONFIG), []);

  return { config, updatePercentage, resetConfig };
}
