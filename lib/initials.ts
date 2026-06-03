// The avatar/nav initials: first letter of first name + first letter of last
// name. If the name is empty (or one word), fall back gracefully so the badge
// is never blank. Shared by the profile header and the bottom-nav tab.
export function getInitials(fullName: string, email: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  if (parts.length === 1) {
    return parts[0][0].toUpperCase()
  }
  return (email[0] ?? '?').toUpperCase()
}
