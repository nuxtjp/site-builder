export interface SiteDocumentLink { title: string; href: string; summary?: string; icon?: string }
export interface SiteDocumentSection { title: string; text: string; code?: string; links?: SiteDocumentLink[] }
export interface SiteDocumentPage { path: string; title: string; summary: string; label?: string; kind: 'home' | 'catalog' | 'journal' | 'article' | 'page'; status: 'published' | 'draft'; category?: string; sections: SiteDocumentSection[] }
export interface SiteDocumentLocale { brand: string; caption: string; origin: string; locale: 'ja' | 'en'; accent: string; icon: string; navigation: SiteDocumentLink[]; secondaryAction?: SiteDocumentLink; resources: (SiteDocumentLink & { category: string; license?: string })[]; pages: SiteDocumentPage[] }
export interface SiteDocuments { siteId: string; origin: string; defaultLocale: 'ja' | 'en'; prefixDefaultLocale?: boolean; localeRootTrailingSlash?: boolean; locales: { ja: SiteDocumentLocale; en: SiteDocumentLocale } }
export function loadSiteDocuments(root: URL | string): Promise<SiteDocuments>
export function documentPublicDirectory(root: URL): Promise<string>
