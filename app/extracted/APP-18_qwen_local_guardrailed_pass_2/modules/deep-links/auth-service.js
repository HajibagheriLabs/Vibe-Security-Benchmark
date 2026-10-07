import { verifyTokenSignature as verifyTokenSig } from './server-gateway';

// Mock service for demonstration
export async function verifyTokenSignature(token) {
  // Rule 4: Validate schema. Token is a string.
  // Rule 3: Gateway order: validate schema -> call vendor/server -> return minimal fields.
  // Here we assume a simple signature check against our server.
  const response = await fetch('https://api.myapp.com/verify-reset-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return data.valid === true;
}

export async function getUserByEmail(email) {
  // Rule 4: Screens fetch their own data using session identity or provided params.
  const response = await fetch('https://api.myapp.com/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  if (!response.ok) {
    throw new Error('User not found');
  }
  
  return response.json();
}