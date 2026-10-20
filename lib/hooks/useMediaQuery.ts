import { useEffect, useState } from 'react';

/** Suit une media query (ex. `(max-width: 900px)`). `false` au premier rendu, pour rester identique côté serveur. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}
