declare module "steam" {
  function isAvailable(): boolean;
  function getAuthTicket(resolve: (ticket: string) => void, reject: (err: string) => void): boolean;
}