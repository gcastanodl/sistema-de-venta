export function saveSession(token, user) {
  localStorage.setItem("ss_token", token);
  localStorage.setItem("ss_user", JSON.stringify(user));
}

export function getSession() {
  const token = localStorage.getItem("ss_token");
  const user = localStorage.getItem("ss_user");
  if (!token || !user) return null;
  return { token, user: JSON.parse(user) };
}

export function clearSession() {
  localStorage.removeItem("ss_token");
  localStorage.removeItem("ss_user");
}

export function getToken() {
  return localStorage.getItem("ss_token");
}