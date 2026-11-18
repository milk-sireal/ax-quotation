import { cp, mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

for (const file of ['app.js', 'quote.js']) {
  execFileSync(process.execPath, ['--check', `src/${file}`], { stdio: 'inherit' })
}
await mkdir('dist', { recursive: true })
await cp('src', 'dist', { recursive: true })
console.log('Built dist/')
