import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatPrice } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function CoursesListPage() {
  const supabase = createAdminClient()

  const { data: courses } = await supabase
    .from('course_products')
    .select('id, title, price, currency, is_active, created_at')
    .order('created_at', { ascending: false })

  const list = courses ?? []

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Courses</h1>
        <Link
          href="/admin/courses/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          + New Course
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No courses yet. Click &ldquo;+ New Course&rdquo; to create
                  your first one.
                </td>
              </tr>
            ) : (
              list.map((course) => (
                <tr
                  key={course.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{course.title}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatPrice(course.price, course.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {course.is_active ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="text-slate-600 transition hover:text-slate-900"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
