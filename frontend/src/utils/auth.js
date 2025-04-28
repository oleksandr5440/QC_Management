// Store the JWT token in localStorage
export const setToken = (token) => {
  localStorage.setItem('qc_token', token);
};

// Get the JWT token from localStorage
export const getToken = () => {
  return localStorage.getItem('qc_token');
};

// Remove the JWT token from localStorage
export const removeToken = () => {
  localStorage.removeItem('qc_token');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getToken();
  return !!token;
};

// Parse JWT token
export const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

// Logout - remove token
export const logout = () => {
  removeToken();
};

// Check if token is expired
export const isTokenExpired = (token) => {
  const decoded = parseJwt(token);
  if (!decoded) return true;
  
  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
};

// Validate the current token
export const validateToken = () => {
  const token = getToken();
  if (!token) return false;
  
  return !isTokenExpired(token);
};
