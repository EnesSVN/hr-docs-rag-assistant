// Most file systems allow at most 255 characters in a name.
const MAX_FILENAME_LENGTH = 255;

export function validateUpload(
  file: File,
): { status: number; message: string } | null {
  if (
    !file.name.toLowerCase().endsWith(".txt") &&
    !file.name.toLowerCase().endsWith(".md")
  ) {
    return { status: 415, message: "only .txt and .md files are supported" };
  }
  if (file.name.length > MAX_FILENAME_LENGTH) {
    return { status: 400, message: "file name is too long" };
  }
  if (file.size === 0) {
    return { status: 400, message: "file is empty" };
  }
  if (file.size > 1_000_000) {
    return { status: 413, message: "file is too large (max 1 MB)" };
  }
  return null;
}
