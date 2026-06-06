import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import CourseForm from '../course-form'
import DeleteCourseButton from './delete-button'

export const dynamic = 'force-dynamic'

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: course } = await supabase
    .from('course_products')
    .select('*')
    .eq('id', id)
    .single()

  if (!course) notFound()

  return (
    <div>
      <CourseForm
        existing={{
          id: course.id,
          title: course.title,
          description: course.description,
          price: Number(course.price),
          currency: course.currency,
          checkoutUrl: course.checkout_url,
          thumbnailUrl: course.thumbnail_url,
          isActive: course.is_active,
        }}
      />

      <div className="mt-8 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">Danger zone</p>
        <p className="mt-1 text-sm text-red-600">
          Deleting a course is permanent. Consider deactivating it instead.
        </p>
        <DeleteCourseButton id={course.id} />
      </div>
    </div>
  )
}
