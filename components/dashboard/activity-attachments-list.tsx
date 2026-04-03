import { Paperclip } from "lucide-react"
import type { ActivityAttachment } from "@/lib/activities/attachments"

type Props = {
  attachments: ActivityAttachment[]
  compact?: boolean
}

export function ActivityAttachmentsList({
  attachments,
  compact,
}: Props) {
  if (attachments.length === 0) return null

  if (compact) {
    return (
      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
        <Paperclip className="h-3 w-3 shrink-0" />
        {attachments.length} anexo
        {attachments.length !== 1 ? "s" : ""}
      </p>
    )
  }

  return (
    <ul className="mt-2 space-y-1">
      {attachments.map((a) => (
        <li key={a.pathname}>
          <a
            href={`/api/activity-attachment?pathname=${encodeURIComponent(a.pathname)}&filename=${encodeURIComponent(a.filename)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#1D4ED8] hover:underline inline-flex items-center gap-1"
          >
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{a.filename}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
