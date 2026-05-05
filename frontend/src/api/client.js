import axios from "axios";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const client = axios.create({
  baseURL: apiBaseUrl,
});

export async function getCourses(subject, term) {
  const res = await client.get("/courses", { params: { subject, term } });
  return res.data;
}

export async function getSubjects(term) {
  const res = await client.get("/subjects", { params: { term } });
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

