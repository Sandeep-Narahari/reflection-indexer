function extractIpfsHash(uri: string | null | undefined): string {
  if (!uri) return "";

  // Case 1: starts with ipfs://
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "").split("?")[0];
  }

  // Case 2: contains /ipfs/<hash>
  const ipfsIndex = uri.indexOf("/ipfs/");
  if (ipfsIndex !== -1) {
    return uri.substring(ipfsIndex + 6).split("/")[0].split("?")[0];
  }

  // Case 3: raw hash
  if (uri.startsWith("Qm") || uri.length === 46) {
    return uri;
  }

  return "";
}


export { extractIpfsHash };