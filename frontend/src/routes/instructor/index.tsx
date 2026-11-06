import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/instructor/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/instructor/"!</div>
}
