import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

const root = resolve(process.argv[2] ?? 'src')
const port = Number(process.env.PORT ?? 3000)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }
createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname
    const file = resolve(root, '.' + decodeURIComponent(path === '/' ? '/index.html' : path))
    if (!file.startsWith(root + sep) || !types[extname(file)]) throw new Error('Unknown path')
    const body = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)] + '; charset=utf-8' })
    response.end(body)
  } catch {
    response.writeHead(404).end()
  }
}).listen(port, '0.0.0.0', () => console.log(`Listening on port ${port}`))
