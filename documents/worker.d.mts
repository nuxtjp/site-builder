export interface DocumentDelivery { origin: string; routes: { route: string; raw: string }[] }
export function createDocumentWorker(delivery: DocumentDelivery): {
  fetch(request: Request, env: { ASSETS: { fetch(request: Request): Promise<Response> } }): Promise<Response>
}
