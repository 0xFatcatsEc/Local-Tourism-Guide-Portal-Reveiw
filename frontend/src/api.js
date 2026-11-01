export const API_URL = "http://127.0.0.1:8000"

export function mediaUrl(value) {
  if (!value) return ""

  try {
    const url = new URL(value, `${API_URL}/`)

    return ["http:", "https:"].includes(url.protocol) ? url.href : ""
  } catch {
    return ""
  }
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    let message = "Something went wrong."

    if (typeof data.detail === "string") {
      message = data.detail
    } else if (Array.isArray(data.detail)) {
      message = data.detail
        .map((error) => {
          const field = error.loc?.slice(1).join(".")
          return field ? `${field}: ${error.msg}` : error.msg
        })
        .join(", ")
    }

    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return data
}