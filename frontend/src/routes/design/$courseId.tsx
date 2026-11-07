import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/design/$courseId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/design/$courseId"!</div>
}
