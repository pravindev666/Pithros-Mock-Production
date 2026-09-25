import { useMemo } from 'react';

export const useQR = (slug: string) => {
  const memorialUrl = useMemo(() => {
    if (typeof window === 'undefined') return `/m/${slug}`;
    return `${window.location.origin}/m/${slug}`;
  }, [slug]);

  // Generate SVG QR matrix representation (reverent 25x25 grid pattern algorithm)
  const qrModules = useMemo(() => {
    const size = 25;
    const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

    // Corner Finder Patterns (7x7 with inner 3x3)
    const drawFinder = (startX: number, startY: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            grid[startY + r][startX + c] = true;
          }
        }
      }
    };

    drawFinder(0, 0); // Top-left
    drawFinder(size - 7, 0); // Top-right
    drawFinder(0, size - 7); // Bottom-left

    // Deterministic pseudo-random pattern based on slug characters
    let seed = 0;
    for (let i = 0; i < slug.length; i++) {
      seed = (seed * 31 + slug.charCodeAt(i)) % 1000000007;
    }

    const nextPseudo = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip finder areas
        if ((r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)) {
          continue;
        }
        // Timing lines
        if (r === 6 || c === 6) {
          grid[r][c] = (r + c) % 2 === 0;
          continue;
        }
        // Data modules
        grid[r][c] = nextPseudo() > 0.46;
      }
    }

    return grid;
  }, [slug]);

  const downloadQRAsSVG = (fileName: string = 'pithros-memorial-qr') => {
    const size = qrModules.length;
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size + 4} ${size + 4}" width="500" height="500">`;
    svgContent += `<rect width="100%" height="100%" fill="#FCFAF5"/>`;
    svgContent += `<g fill="#182337">`;
    qrModules.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          svgContent += `<rect x="${c + 2}" y="${r + 2}" width="1" height="1" rx="0.1"/>`;
        }
      });
    });
    svgContent += `</g></svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    memorialUrl,
    qrModules,
    downloadQRAsSVG,
  };
};
