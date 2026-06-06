// Turn a human title into a URL-safe slug.
//   "Sam's Big Week!"      -> "sams-big-week"
//   "3 Ways to Win — Fast" -> "3-ways-to-win-fast"
//
// Steps: lowercase, strip accents, turn any run of non-letter/digit characters
// into a single hyphen, then trim hyphens off the ends. The result only ever
// contains a-z, 0-9 and hyphens, which is always safe in a URL.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD') // split accented letters into letter + accent mark
    .replace(/[̀-ͯ]/g, '') // drop the accent marks
    .replace(/[^a-z0-9]+/g, '-') // any non-alphanumeric run -> one hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
}
