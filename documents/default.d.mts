import type { ResolvedSiteConfig } from '../validator/contracts/types.js'
export function materializeDefaultDocuments(config: ResolvedSiteConfig, directory: string): Promise<{ components: string; publicDirectory: string }>
