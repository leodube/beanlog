import { createContext } from "react-router";

import type { AuthUser } from "./session.server";

/** The signed-in user, set by the auth middleware for every protected route. */
export const userContext = createContext<AuthUser>();
/** Hash of the current session id, for "log out other devices". */
export const sessionIdContext = createContext<string>();
