import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getReadingRepository } from '@/data/repositories/factory';
import type { Reading } from '@/domain/models/reading';
import type { ReadingListFilter } from '@/domain/repositories/reading-repository';

interface UseReadingsResult {
  readings: Reading[];
  isLoading: boolean;
  error?: string;
  reload: () => Promise<void>;
}

/**
 * Newest-first list of readings for the given filter. Reloads whenever the
 * screen regains focus, so additions/edits/deletions made on other screens are
 * reflected without manual refresh. SQLite stays the source of truth — nothing
 * is mirrored into global state.
 */
export function useReadings(filter?: ReadingListFilter): UseReadingsResult {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  // Depend on the primitive bounds, not the filter object identity.
  const from = filter?.from;
  const to = filter?.to;

  const reload = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await getReadingRepository().list({ from, to });
      setReadings(list);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { readings, isLoading, error, reload };
}

interface UseReadingResult {
  reading?: Reading;
  isLoading: boolean;
  error?: string;
  reload: () => Promise<void>;
}

/** Single reading by id, reloaded on focus (so edits show on return to detail). */
export function useReading(id: string | undefined): UseReadingResult {
  const [reading, setReading] = useState<Reading | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const reload = useCallback(async () => {
    if (id === undefined) {
      setReading(undefined);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setReading(await getReadingRepository().getById(id));
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { reading, isLoading, error, reload };
}
