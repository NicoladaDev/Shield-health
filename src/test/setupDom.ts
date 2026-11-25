import { afterEach } from 'vitest';
import { installDomShim, resetDomShim, runBeforeResetHooks } from './domShim';

installDomShim();

afterEach(async () => {
  await runBeforeResetHooks();
  resetDomShim();
});
