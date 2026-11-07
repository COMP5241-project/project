import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/design")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Design your own learning path</div>;
}
