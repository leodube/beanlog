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
    index("routes/index.ts"),
    route("brews", "routes/brews.tsx", [
      // Overlays: drawers over the list on desktop, full pages on the phone.
      route("new", "routes/brews.new.tsx"),
      route(":brewId", "routes/brews.$brewId.tsx"),
    ]),
    route("coffee", "routes/coffee.tsx", [
      route("new", "routes/coffee.new.tsx"),
      route(":coffeeId", "routes/coffee.$coffeeId.tsx"),
      route(":coffeeId/edit", "routes/coffee.$coffeeId.edit.tsx"),
    ]),
    route("recipes", "routes/recipes.tsx", [
      route("new", "routes/recipes.new.tsx"),
      route(":recipeId", "routes/recipes.$recipeId.tsx"),
    ]),
    route("stats", "routes/stats.tsx"),
    route("settings", "routes/settings.tsx"),
    route("logout", "routes/logout.ts"),
  ]),
] satisfies RouteConfig;
