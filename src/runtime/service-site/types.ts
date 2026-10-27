export type Locale = 'ja' | 'en'
export interface Link { title: string; href: string; summary?: string; icon?: string }
export interface Section { title: string; text: string; links?: Link[]; code?: string }
export interface Page {
  path: string; title: string; summary: string; label?: string
  kind?: 'home' | 'catalog' | 'journal' | 'article' | 'page'
  sections: Section[]; category?: string; status?: 'draft' | 'published'
}
export interface Resource extends Link { category: string; license?: string }
export interface SiteContent {
  brand: string; caption: string; origin: string; locale: Locale; accent: string; icon: string
  navigation: Link[]; pages: Page[]; resources: Resource[]
  secondaryAction?: Link
}



export type PreviewKind = 'workspace' | 'directory' | 'meaning' | 'code' | 'portfolio' | 'business' | 'trust' | 'plan' | 'environment'
export interface Experience {
  category: string
  primary: Link
  secondary: Link
  pathsTitle: string
  paths: Link[]
  preview: {
    kind: PreviewKind
    label: string
    title: string
    rows: { label: string; detail: string }[]
    outcome: string
  }
}

export interface ServiceSiteData { siteId: string; origin: string; defaultLocale: Locale; locales: Record<Locale, SiteContent> }
export type ServiceExperiences = Record<Locale, Experience>
