"use client";

import { useRef, useState } from "react";
import type { PhotoRole } from "@prisma/client";
import { addFacePhoto, removeFacePhoto } from "@/app/actions";

export type UploadedPhoto = { id: string; storageUrl: string };

const MAX_PHOTOS = 3;
const MIN_DIMENSION = 400;
const MAX_UPLOAD_DIMENSION = 1600;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

/**
 * Uploads immediately on file select (not deferred to the big "Save"
 * button) — each photo gets its own row via a dedicated server action, so
 * there's nothing to bundle into the main invite form. Validation here is
 * only file type / size / resolution; real face-count and frontal-ness
 * checks need a face-detection approach that hasn't been chosen yet, so
 * that happens at generation time, not here.
 */
export function PhotoUpload({
  inviteId,
  role,
  label,
  hint,
  initialPhotos,
  onChange,
}: {
  inviteId: string;
  role: PhotoRole;
  label: string;
  hint: string;
  initialPhotos: UploadedPhoto[];
  /** Fires after any add/remove, so a parent can mirror it (e.g. a live preview). */
  onChange?: (photos: UploadedPhoto[]) => void;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function updatePhotos(next: UploadedPhoto[]) {
    setPhotos(next);
    onChange?.(next);
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);

    if (photos.length >= MAX_PHOTOS) {
      setError(`You can upload up to ${MAX_PHOTOS} photos.`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("That photo is too large (max 8MB).");
      return;
    }

    setUploading(true);
    try {
      const { dataUrl, width, height } = await downscaleToDataUrl(file);
      if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
        setError(`Photo must be at least ${MIN_DIMENSION}×${MIN_DIMENSION}px.`);
        return;
      }
      const result = await addFacePhoto(inviteId, role, dataUrl, width, height);
      if (result.error) setError(result.error);
      else if (result.photo) updatePhotos([...photos, result.photo]);
    } catch {
      setError("Couldn't read that image. Try a different file.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(id: string) {
    updatePhotos(photos.filter((photo) => photo.id !== id));
    await removeFacePhoto(id);
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.32em] text-[#9b5f36]">{label}</p>
        <p className="mt-1 text-xs text-[#8a6b5c]">{hint}</p>
      </div>
      {error && <p className="text-xs text-[#8f342b]">{error}</p>}
      <div className="flex flex-wrap gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative h-24 w-24 overflow-hidden rounded-sm border border-[#c9956a]/30">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URLs, not app assets */}
            <img src={photo.storageUrl} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(photo.id)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs leading-none text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
            >
              &times;
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-[#c9956a]/50 text-[9px] uppercase tracking-[0.14em] text-[#9b5f36] transition-colors hover:bg-white disabled:opacity-50"
          >
            <PlusIcon />
            {uploading ? "Uploading…" : "Add photo"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function downscaleToDataUrl(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
      const width = Math.round(img.naturalWidth * scale);
      const height = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) {
        reject(new Error("Canvas not available"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      // Validate against the *original* resolution — downscaling is for
      // payload size, not a way to dodge the minimum-resolution check.
      resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.85), width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}
