import { createContext } from 'react';
import type { CoCart } from '@cocartheadless/sdk';

export const CoCartContext = createContext<CoCart | null>(null);
