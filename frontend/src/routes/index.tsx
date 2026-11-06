import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

const requiredCourses = [
  {
    id: 1,
    name: "Fundamentals of software engineering and software development",
  },
  {
    id: 2,
    name: "Effective use of AI coding agents in software development",
  },
  {
    id: 3,
    name: "Soft skills and product skills used in software development",
  },
  {
    id: 4,
    name: "Others",
  },
];

function RouteComponent() {
  return (
    <div>
      <h1>Welcome!</h1>
      <div>
        <p>Courses</p>
        <ul>
          {requiredCourses.map((course) => (
            <li key={course.id}>{course.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
