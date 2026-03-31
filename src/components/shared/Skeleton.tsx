import React from 'react'

interface Props { rows?: number }

export default function Skeleton({ rows = 6 }: Props) {
  return (
    <div className="flex flex-col gap-2 p-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="skeleton w-8 h-3 flex-shrink-0" />
          <div className="skeleton flex-1 h-3" style={{ width: `${60 + (i % 3) * 15}%` }} />
          <div className="skeleton w-6 h-3 flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}
