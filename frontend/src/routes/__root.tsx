import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import type { AppRouterContext } from "@/main";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorComponent } from "@/components/ErrorComponent";
import { NotFoundComponent } from "@/components/NotFoundComponent";

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  return (
    <div>
      <Outlet />
      <ReactQueryDevtools />
      <TanStackRouterDevtools />
    </div>
  );
}
