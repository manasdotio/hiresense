export const testCases = [
  {
    input: "Looking for Node.js backend developer with PostgreSQL and Docker experience. 2+ years required.",
    expected: {
      required_skills: ["Node.js", "PostgreSQL", "Docker"],
      preferred_skills: [],
      minExperience: 2,
    },
  },
  {
    input: "We need a React developer. Must know React, JavaScript and REST APIs. Next.js is a plus. 3 years experience required.",
    expected: {
      required_skills: ["React", "JavaScript", "REST APIs"],
      preferred_skills: ["Next.js"],
      minExperience: 3,
    },
  },
];