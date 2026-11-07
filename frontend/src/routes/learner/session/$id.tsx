import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/learner/session/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/learner/session/$id"!</div>
}
