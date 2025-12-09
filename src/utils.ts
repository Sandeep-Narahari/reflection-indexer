function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeFetch(url: string, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);

      // Handle rate limiting
      if (res.status === 429) {
        console.warn(`HTTP 429 on ${url}. Waiting 2s... (attempt ${i + 1})`);
        await sleep(2000);
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.json();

    } catch (err) {
      if (i === retries - 1) throw err;

      console.warn(`Fetch failed → retrying in 1s... (attempt ${i + 1})`);
      await sleep(1000);
    }
  }
}

export { sleep, safeFetch };
