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

const presentationFormat = [
  {
    id: 1,
    name: "Text and Images",
  },
  {
    id: 2,
    name: "Interactive Simulations",
  },
  {
    id: 3,
    name: "Interactive Role-Play Activities",
  },
  {
    id: 4,
    name: "Games",
  },
  {
    id: 5,
    name: "Animations",
  },
  {
    id: 6,
    name: "Slides Based",
  },
  {
    id: 7,
    name: "Online Coding",
  },
];

const experienceLevel = [
  {
    id: 1,
    name: "Non Computer Science Background",
  },
  {
    id: 2,
    name: "Computer Science Background",
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
      <div>
        <p>Presentation Format</p>
        <ul>
          {presentationFormat.map((format) => (
            <li key={format.id}>{format.name}</li>
          ))}
        </ul>
      </div>
      <div>
        <p>Experience Level</p>
        <ul>
          {experienceLevel.map((level) => (
            <li key={level.id}>{level.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
