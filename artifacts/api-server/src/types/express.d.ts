import type { User } from "@workspace/db";
import type { Logger } from "pino";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      log: Logger;
    }
  }
}
