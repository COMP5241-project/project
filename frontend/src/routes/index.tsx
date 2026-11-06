import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <h1>Welcome to the Learning Platform!</h1>
      <p>Please select your role to continue.</p>
      <div>
        <Link to="/learner">
          <button>Learner</button>
        </Link>
        <Link to="/instructor">
          <button>Instructor</button>
        </Link>
      </div>
    </div>
  );
}
