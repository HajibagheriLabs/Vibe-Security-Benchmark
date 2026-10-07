import { AvatarUpload } from '@/components/AvatarUpload';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { useState } from 'react';

export default function ProfilePage() {
  const [avatarUrl, setAvatarUrl] = useState<string>('/api/avatars/default.svg');

  const handleUpload = (url: string, filename: string) => {
    setAvatarUrl(url);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Profile Settings</h1>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
        <AvatarDisplay src={avatarUrl} alt="Profile avatar" size={100} />
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Profile Avatar</h2>
          <p style={{ margin: '0.25rem 0 0', color: '#6b7280' }}>
            Upload an SVG file to use as your profile picture
          </p>
        </div>
      </div>

      <AvatarUpload 
        onUpload={handleUpload} 
        currentAvatarUrl={avatarUrl} 
      />
    </div>
  );
}