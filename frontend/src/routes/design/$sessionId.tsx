import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/design/$sessionId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/design/$sessionId"!</div>
}
