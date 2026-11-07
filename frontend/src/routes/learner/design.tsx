import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/learner/design')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/learner/design"!</div>
}
