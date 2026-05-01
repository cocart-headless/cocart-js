import type { BuilderState } from './state.js';

export interface StateStore {
  get(): BuilderState;
  update(patch: Partial<BuilderState>): void;
  subscribe(fn: (state: BuilderState) => void): () => void;
}
