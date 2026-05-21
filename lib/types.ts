export interface ApiGame {
  appid: string
  name: string
  added_date: string
  updated_date: string
  type: string
  tags: string[]
  nsfw: boolean
  drm: boolean
  dlc: Record<number, string>
  header_image: string
}

export interface Game {
  appid: string
  name: string
  image: string
  type: string
  tags: string[]
  nsfw: boolean
  drm: boolean
  dlc: Record<number, string>
}

export interface FilterData {
  dlc: string[]
  drm: string[]
  soundtrack: string[]
  nsfw: string[]
  delisted: string[]
}

export interface UserProfile {
  username: string
  role: string
  id: string
  avatar?: string
}

export interface ProxySettings {
  enabled: boolean
  host: string
  port: string
  username?: string
  password?: string
}

export interface AppSettings {
  theme: 'dark' | 'light'
  gameCardSize: '50%' | '75%' | '100%'
  downloadPath: string
  proxy: string
  ryuuApiKey: string
}

export type NavItem = 'games' | 'library' | 'settings'

export type SortOption = 'name-asc' | 'name-desc' | 'appid-asc' | 'appid-desc' | 'added-asc' | 'added-desc'

export type TypeFilter = 'all' | 'application' | 'beta' | 'config' | 'dlc' | 'demo' | 'game' | 'music' | 'tool' | 'media'

export type SpecialFilter = 'nsfw' | 'drm' | 'delisted'
