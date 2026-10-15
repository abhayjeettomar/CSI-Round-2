// scratch/fetch-images.js
import fs from 'fs';
import path from 'path';

const pages = [
  { url: 'https://www.bennett.edu.in/facilities/library/', slot: 'library-interior' },
  { url: 'https://www.bennett.edu.in/campus-life/sports/', slot: 'sports' },
  { url: 'https://www.bennett.edu.in/campus-life/', slot: 'campus-walk' }
];

async function run() {
  const manifest = {};
  const credits = [];

  for (const item of pages) {
    try {
      console.log(`Checking ${item.url}...`);
      const res = await fetch(item.url);
      if (!res.ok) continue;
      const html = await res.text();
      const matches = Array.from(html.matchAll(/https:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi)).map(m => m[0]);
      
      // Filter for campus facilities images
      const valid = matches.filter(url => 
        url.includes('/uploads/') && 
        !url.includes('logo') && 
        !url.includes('icon') &&
        !url.includes('flag')
      );

      if (valid.length > 0) {
        const imgUrl = valid[0];
        console.log(`Found candidate for ${item.slot}: ${imgUrl}`);
        const ext = imgUrl.split('.').pop().toLowerCase();
        const filename = `${item.slot}.${ext}`;
        const filePath = path.resolve('public', 'campus', filename);

        const imgRes = await fetch(imgUrl);
        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          fs.writeFileSync(filePath, buffer);
          console.log(`Saved ${filename} (${buffer.length} bytes)`);

          manifest[item.slot] = {
            file: filename,
            alt: `Bennett University ${item.slot.replace('-', ' ')}`,
            sourceUrl: imgUrl
          };
          credits.push(`${item.slot}: ${imgUrl} (Source: ${item.url})`);
        }
      }
    } catch (err) {
      console.log(`Error on ${item.url}:`, err.message);
    }
  }

  if (Object.keys(manifest).length > 0) {
    fs.writeFileSync('public/campus/manifest.json', JSON.stringify(manifest, null, 2));
    fs.writeFileSync('public/campus/CREDITS.txt', `BU PULSE Campus Image Credits & Manifest Registry\nAll verified architectural references & campus photography sourced from:\nhttps://www.bennett.edu.in\n\nVerified downloads:\n` + credits.join('\n') + `\n\nSlots without official imagery render bespoke architectural SVG blueprints.\n`);
    console.log('Manifest and CREDITS.txt updated successfully!');
  } else {
    console.log('No eligible images found; keeping architectural SVG blueprint fallback.');
  }
}

run();
