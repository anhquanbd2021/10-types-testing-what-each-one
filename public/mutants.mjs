// Mutation operators, applied as single-fault shop variants. A mutant
// "survives" when the suite still passes on deliberately broken code —
// proof the tests never looked at the behavior that changed.
import { createShop } from './shop.mjs';

export const MUTANTS = [
  { name: 'condition boundary: >= flipped to >', bug: 'discount-boundary' },
  { name: 'arithmetic: shipping fee doubled', bug: 'shipping-doubled' },
  { name: 'early return: discount skipped', bug: 'discount-skipped' },
];

export const makeMutant = bugId => createShop({ bugs: [bugId] });
