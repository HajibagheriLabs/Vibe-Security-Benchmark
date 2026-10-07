"use client";

import { useState } from "react";
import { updateUserProfile, type UpdateUserProfileData } from "@/app/actions/updateUserProfile";

interface ProfilePageProps {
  params: { userId: string };
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const [formData, setFormData] = useState<UpdateUserProfileData>({
    displayName: "",
    bio: "",
    avatarUrl: "",
    location: "",
    website: "",
  });
  const [status, setStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value || undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    // Filter out empty strings before sending
    const cleanedData = Object.fromEntries(
      Object.entries(formData).filter(([_, value]) => value !== "" && value !== undefined)
    ) as UpdateUserProfileData;

    const result = await updateUserProfile(params.userId, cleanedData);

    if (result.success) {
      setStatus("Profile updated successfully!");
    } else {
      setStatus(`Error: ${result.error}`);
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold">Edit Profile</h1>

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium">
          Display Name
        </label>
        <input
          type="text"
          id="displayName"
          name="displayName"
          value={formData.displayName || ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          value={formData.bio || ""}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div>
        <label htmlFor="avatarUrl" className="block text-sm font-medium">
          Avatar URL
        </label>
        <input
          type="url"
          id="avatarUrl"
          name="avatarUrl"
          value={formData.avatarUrl || ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium">
          Location
        </label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location || ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      <div>
        <label htmlFor="website" className="block text-sm font-medium">
          Website
        </label>
        <input
          type="url"
          id="website"
          name="website"
          value={formData.website || ""}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>

      {status && (
        <p className={status.startsWith("Error") ? "text-red-600" : "text-green-600"}>
          {status}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}