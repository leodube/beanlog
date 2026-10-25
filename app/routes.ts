import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  // Public
  route("login", "routes/login.tsx"),
  route("healthz", "routes/healthz.ts"),

  // Everything else requires a signed-in user (middleware in _app.tsx).
  layout("routes/_app.tsx", [
    index("routes/home.tsx"),
    route("logout", "routes/logout.ts"),
  ]),
] satisfies RouteConfig;
