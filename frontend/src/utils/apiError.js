export function getApiErrorMessage(error, fallback = "Something went wrong.") {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first?.msg === "string") return first.msg;
  }
  if (typeof error?.message === "string" && error.message.trim()) return error.message;
  return fallback;
}
