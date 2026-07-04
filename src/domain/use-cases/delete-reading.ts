import type { ReadingUseCaseDeps } from './reading-use-case-deps';

export async function deleteReading(
  id: string,
  deps: Pick<ReadingUseCaseDeps, 'repository'>,
): Promise<void> {
  await deps.repository.delete(id);
}
