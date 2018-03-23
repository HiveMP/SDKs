import * as TA from 'typedarray';

// Bind all of our typedarray polyfills into the global scope.
global.Int8Array = TA.Int8Array;
global.Uint8Array = TA.Uint8Array;
global.Uint8ClampedArray = TA.Uint8ClampedArray;
global.Int16Array = TA.Int16Array;
global.Uint16Array = TA.Uint16Array;
global.Uint32Array = TA.Uint32Array;
global.Float32Array = TA.Float32Array;
global.Float64Array = TA.Float64Array;
global.DataView = TA.DataView;
global.ArrayBuffer = TA.ArrayBuffer;