import type { ReadingRepository } from '../repositories/reading-repository';

export interface ReadingUseCaseDeps {
  repository: ReadingRepository;
  generateId: () => string;
  now: () => number; // Unix ms
}
