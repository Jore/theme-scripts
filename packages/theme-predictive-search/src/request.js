export default function request(url) {
  var fetchConfig = {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json"
    }
  };

  return fetch(url, fetchConfig);
}

export function parseResponseStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return Promise.resolve(response);
  }

  var error = new Error(response.statusText);

  if (response.status === 429) {
    var retryAfter = response.headers.get("Retry-After");

    if (retryAfter) {
      error.name = "Throttled";
      error.retryAfter = parseInt(retryAfter, 10);
    }
  }

  return Promise.reject(error);
}

export function parseResponse(response) {
  if (
    response.headers.get("Content-Type").match("application/json").length > 0
  ) {
    return response.json();
  }

  return response.text();
}
