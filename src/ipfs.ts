function extractIpfsHash(input: string): string | null {
  const match = input.match(
    /(?:ipfs[:/]{1,3})([A-Za-z0-9]+)|([A-Za-z0-9]{46,})$/
  );

  const hash = match ? (match[1] || match[2]) : null;
  console.log(` Extracted IPFS Hash: ${hash} from input: ${input}`);
  return hash;
}


export { extractIpfsHash };

// function extractIpfsHash(input: string): string | null {
//   const match = input.match(/(?:ipfs\/)([A-Za-z0-9]+)$/);
//   return match ? match[1] : null;
// }

// Examples:
extractIpfsHash("ipfs/QmTxxBR2raHNei8jFymhnAJFi5otVxREZgZjtcbmsV6rPk");
// → "QmTxxBR2raHNei8jFymhnAJFi5otVxREZgZjtcbmsV6rPk"

extractIpfsHash("https://gateway.pinata.cloud/ipfs/QmUyjcmHQfdDCjgJYgLKNJqniXPmPifJVcr2TcoEsKCDdX");
// → "QmUyjcmHQfdDCjgJYgLKNJqniXPmPifJVcr2TcoEsKCDdX"
