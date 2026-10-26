import { describe, expect, it } from "vitest";
import { attachmentSizeError, attachmentUploadQuery, MAX_IMAGE_BYTES, MAX_ATTACHMENT_BYTES } from "./attachment-policy";

describe("image attachment policy", () => {
  it("allows images exactly at 5 MiB and rejects the next byte", () => {
    expect(attachmentSizeError({ type: "image/png", size: MAX_IMAGE_BYTES })).toBeNull();
    expect(attachmentSizeError({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 })).toBe("max_image_size");
  });
  it("preserves the 25 MiB limit for other files", () => {
    expect(attachmentSizeError({ type: "video/mp4", size: MAX_ATTACHMENT_BYTES })).toBeNull();
    expect(attachmentSizeError({ type: "application/pdf", size: MAX_ATTACHMENT_BYTES + 1 })).toBe("max_file_size");
  });
  it("binds uploads to the captured room and identifies encrypted images", () => {
    expect(attachmentUploadQuery(42, "image")).toBe("?roomId=42&kind=image");
    expect(attachmentUploadQuery(43, "audio")).toBe("?roomId=43");
  });
});