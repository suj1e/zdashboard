import http from 'node:http';

/**
 * Read the full body of an IncomingMessage.
 * Listens for 'error' to prevent a hanging promise when the client aborts mid-stream.
 */
export async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: string | Buffer) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve('')); // client abort → settle with empty string
  });
}
