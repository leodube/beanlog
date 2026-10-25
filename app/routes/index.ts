import { redirect } from "react-router";

// Brews is the home page.
export function loader() {
  return redirect("/brews");
}
