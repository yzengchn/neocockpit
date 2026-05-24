/** Convert a file-system path to a web-accessible URL under /output. */
export const toWebUrl = (p: string): string => {
  if (p.startsWith("/output")) return p;
  return p.replace(/^(\.\.?\/output)/, "/output");
};
