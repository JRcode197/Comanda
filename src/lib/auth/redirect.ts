export function safeRedirect(value: string | null | undefined) {
  if (!value || !/^\/[a-zA-Z0-9/-]*$/.test(value) || value.startsWith("//"))
    return "/";
  return value;
}
