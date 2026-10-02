import { useMemo, useState, useEffect } from 'react';
import { API_BASE_URL, API_PREFIX } from '../lib/config';

export const useQR = (slug: string) => {
  const memorialUrl = useMemo(() => {
    if (typeof window === 'undefined') return `/m/${slug}`;
    return `${window.location.origin}/m/${slug}`;
  }, [slug]);

  const qrSvgUrl = useMemo(() => {
    return `${API_BASE_URL}${API_PREFIX}/public/memorials/${encodeURIComponent(slug)}/qr?format=svg`;
  }, [slug]);

  const qrPngUrl = useMemo(() => {
    return `${API_BASE_URL}${API_PREFIX}/public/memorials/${encodeURIComponent(slug)}/qr?format=png`;
  }, [slug]);

  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(qrSvgUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`QR fetch failed with HTTP ${res.status}`);
        return res.text();
      })
      .then((svg) => {
        if (isMounted) {
          setSvgContent(svg);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [qrSvgUrl]);

  // Backward compatibility mock grid fallback only if real SVG is loading and a component expects array
  const qrModules = useMemo(() => {
    return Array.from({ length: 25 }, () => Array(25).fill(false));
  }, []);

  const downloadQRAsSVG = async (fileName: string = `pithros-qr-${slug}`) => {
    try {
      const res = await fetch(`${qrSvgUrl}&download=true`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(`${qrSvgUrl}&download=true`, '_blank');
    }
  };

  const downloadQRAsPNG = async (fileName: string = `pithros-qr-${slug}`) => {
    try {
      const res = await fetch(`${qrPngUrl}&download=true`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(`${qrPngUrl}&download=true`, '_blank');
    }
  };

  return {
    memorialUrl,
    qrSvgUrl,
    qrPngUrl,
    svgContent,
    isLoading,
    qrModules,
    downloadQRAsSVG,
    downloadQRAsPNG,
  };
};
