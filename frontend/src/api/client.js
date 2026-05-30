import axios from "axios";

const apiBaseUrl = "http://localhost:8000/api";

const client = axios.create({
  baseURL: apiBaseUrl,
});

export async function getCourses(subject, term, includeDescriptions = false) {
  const res = await client.get("/courses", {
    params: { subject, term, includeDescriptions },
  });
  return res.data;
}

export async function getSubjects(
  term,
  searchTerm = "",
  offset = 1,
  max = 10,
  uniqueSessionId = ""
) {
  const res = await client.get("/subjects", {
    params: { term, searchTerm, offset, max, uniqueSessionId },
  });
  return res.data;
}

export async function getHealth() {
  const res = await client.get("/health");
  return res.data;
}

export async function getTerms(offset = 1, max = 10, searchTerm = "") {
  const res = await client.get("/terms", {
    params: { offset, max, searchTerm },
  });
  return res.data;
}

export async function getCourseDescription(crn, term) {
  const res = await client.get(`/courses/${encodeURIComponent(crn)}/description`, {
    params: { term },
  });
  return res.data;
}

