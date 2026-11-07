import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/design")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
