export function validateUpload(
  file: File,
): { status: number; message: string } | null {
  if (
    !file.name.toLowerCase().endsWith(".txt") &&
    !file.name.toLowerCase().endsWith(".md")
  ) {
    return { status: 415, message: "only .txt and .md files are supported" };
  }
  if (file.size === 0) {
    return { status: 400, message: "file is empty" };
  }
  if (file.size > 1_000_000) {
    return { status: 413, message: "file is too large (max 1 MB)" };
  }
  return null;
}
