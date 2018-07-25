import 'es6-promise/auto';
import './typedarray-load';

import { init as initAuth } from './subsystem/auth';

const subsystems = [
  initAuth
];

for (const initSubsystem of subsystems) {
  initSubsystem();
}