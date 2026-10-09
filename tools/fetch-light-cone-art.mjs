import { readFile, mkdir, writeFile } from 'node:fs/promises';
const cones = JSON.parse(await readFile('data/light-cones.json', 'utf8'));
await mkdir('assets/light-cones', { recursive: true });
for (const cone of cones) {
  const response = await fetch(cone.imageSource);
  if (!response.ok) throw new Error(`${cone.name}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`${cone.name}: invalid PNG`);
  await writeFile(`assets/light-cones/${cone.id}.png`, bytes);
}
console.log(`Fetched ${cones.length} official card images.`);
