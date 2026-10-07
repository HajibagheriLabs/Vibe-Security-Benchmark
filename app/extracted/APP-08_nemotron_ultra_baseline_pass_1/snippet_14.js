const { logout } = useAuth();

// Revokes refresh token on server then clears local storage
await logout();