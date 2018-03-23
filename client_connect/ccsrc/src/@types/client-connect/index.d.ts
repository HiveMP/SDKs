type ClientConnectRequireFunction = (id: string) => any;

declare var require: ClientConnectRequireFunction;

declare var global: any;

interface Error {
  message: string;
  stackTrace?: string;
}
