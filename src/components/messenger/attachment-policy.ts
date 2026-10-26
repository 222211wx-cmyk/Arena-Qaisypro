export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export function attachmentSizeError(file: Pick<File, "type" | "size">) {
  const image = file.type.startsWith("image/");
  return file.size > (image ? MAX_IMAGE_BYTES : MAX_ATTACHMENT_BYTES)
    ? image ? "max_image_size" : "max_file_size"
    : null;
}

export function attachmentUploadQuery(roomId: number, kind: string) {
  const query = new URLSearchParams({ roomId: String(roomId) });
  if (kind === "image") query.set("kind", "image");
  return `?${query}`;
}