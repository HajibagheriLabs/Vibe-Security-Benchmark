// ApiService.js
import { useAuthFetch } from 'react-native-auth-service';

export function useApi() {
  const authFetch = useAuthFetch();

  const getProfile = () => authFetch('https://api.example.com/user/profile')
    .then(res => res.json());

  const postData = (data) => authFetch('https://api.example.com/data', {
    method: 'POST',
    body: JSON.stringify(data),
  }).then(res => res.json());

  return { getProfile, postData };
}