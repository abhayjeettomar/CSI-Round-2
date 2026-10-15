// public/components/QRPass.js
// Pure client-side deterministic 21x21 SVG QR matrix generator (zero external network calls)

export function renderQRPassSVG(data, size = 180) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  const matrix = generateMatrix(str);

  let rects = '';
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      if (matrix[r][c]) {
        rects += `<rect x="${c}" y="${r}" width="1" height="1" fill="#141413" />`;
      }
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" width="${size}" height="${size}" shape-rendering="crispEdges" style="background:#FFFFFF; padding: 8px; border-radius: 4px; border: 1px solid var(--border-hairline);">
      ${rects}
    </svg>
  `;
}

function generateMatrix(seedStr) {
  // Initialize 21x21 grid
  const grid = Array.from({ length: 21 }, () => Array(21).fill(0));
  const reserved = Array.from({ length: 21 }, () => Array(21).fill(false));

  // Helper for 7x7 finder patterns
  function drawFinder(row, col) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        reserved[row + r][col + c] = true;
        if (r === 0 || r === 6 || c === 0 || c === 6) {
          grid[row + r][col + c] = 1;
        } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
          grid[row + r][col + c] = 1;
        } else {
          grid[row + r][col + c] = 0;
        }
      }
    }
    // White separator ring
    for (let i = 0; i < 8; i++) {
      if (row + 7 < 21 && col + i < 21) { reserved[row + 7][col + i] = true; grid[row + 7][col + i] = 0; }
      if (row + i < 21 && col + 7 < 21) { reserved[row + i][col + 7] = true; grid[row + i][col + 7] = 0; }
    }
  }

  // Draw 3 standard QR position finder patterns
  drawFinder(0, 0);   // Top-left
  drawFinder(0, 14);  // Top-right
  drawFinder(14, 0);  // Bottom-left

  // Timing patterns (row 6 and col 6)
  for (let i = 8; i < 13; i++) {
    reserved[6][i] = true;
    grid[6][i] = i % 2 === 0 ? 1 : 0;
    reserved[i][6] = true;
    grid[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Alignment pattern around center (row 14-18, col 14-18)
  for (let r = 14; r <= 18; r++) {
    for (let c = 14; c <= 18; c++) {
      reserved[r][c] = true;
      if (r === 14 || r === 18 || c === 14 || c === 18 || (r === 16 && c === 16)) {
        grid[r][c] = 1;
      } else {
        grid[r][c] = 0;
      }
    }
  }

  // Deterministic seed hash
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  // PRNG
  function nextBit() {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return (hash >> 16) % 2;
  }

  // Fill remaining unreserved data cells
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      if (!reserved[r][c]) {
        grid[r][c] = nextBit();
      }
    }
  }

  return grid;
}
