export function getCsrfToken(): string | null {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="))
  return match ? decodeURIComponent(match.split("=")[1]) : null
}
