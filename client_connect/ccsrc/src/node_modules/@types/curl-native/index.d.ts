declare module "curl-native" {
  interface Request {
    url?: string;
  }

  interface Response {

  }

  function fetch(req: Request, resolve: (res: Response) => void, reject: (err: Error) => void): void;
}