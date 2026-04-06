export type ContentItemType = "article"

export type ContentItemStatus = "draft" | "published"

export type ContentVisibility = "public" | "classrooms" | "private"

export type ContentItemSettings = {
  tags?: string[]
  disciplina?: string
  nivel?: string
  /** Capa em imagem (exclusiva com coverVideoUrl) */
  coverUrl?: string | null
  /** Capa em video (exclusiva com coverUrl) */
  coverVideoUrl?: string | null
}

export type ContentItemRow = {
  id: string
  author_id: string
  type: ContentItemType
  title: string
  body_html: string | null
  status: ContentItemStatus
  visibility: ContentVisibility
  published_at: string | null
  settings: ContentItemSettings
  like_count: number
  share_count: number
  created_at: string
  updated_at: string
}

export type ShareMethod = "copy_link" | "native_share"
