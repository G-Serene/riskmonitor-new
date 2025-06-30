// Utility functions for time formatting

export function formatRelativeTime(minutesAgo: number): string {
  if (minutesAgo < 1) {
    return "Just now"
  } else if (minutesAgo < 60) {
    return `${minutesAgo} minute${minutesAgo === 1 ? '' : 's'} ago`
  } else if (minutesAgo < 1440) { // Less than 24 hours
    const hours = Math.floor(minutesAgo / 60)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  } else {
    const days = Math.floor(minutesAgo / 1440)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }
}

export function formatFullDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

export function formatTimeOnly(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}
