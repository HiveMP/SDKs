import 'es6-promise/auto';
import './typedarray-load';

import { init as initAuth } from './subsystem/auth';
import { init as initClientConnect } from './subsystem/client-connect';

const subsystems = [
  initAuth,
  initClientConnect,
];

for (const initSubsystem of subsystems) {
  initSubsystem();
}