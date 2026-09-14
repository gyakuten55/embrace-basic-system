import Link from 'next/link'
import { notFound } from 'next/navigation'
import { activeClients, activeServices, activeStaff, visitById } from '@/lib/queries'
import { startOfWeek } from '@/lib/date'
import { Breadcrumb, Content, PageHeader } from '@/components/ui'
import { VisitForm } from '../../visit-form'

export const dynamic = 'force-dynamic'

export default async function EditVisitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ week?: string }>
}) {
  const { id } = await params
  const { week } = await searchParams
  const visit = visitById(Number(id))
  if (!visit) notFound()

  return (
    <>
      <PageHeader
        title="訪問予定の編集"
        sub={`${visit.date}　${visit.client_name}`}
        actions={
          <Link href={`/records/${visit.id}`} className="btn btn-default">
            この訪問の記録
          </Link>
        }
      />
      <Content className="max-w-3xl space-y-3">
        <Breadcrumb items={[{ label: 'スケジュール', href: '/schedule' }, { label: '予定の編集' }]} />
        <VisitForm
          visit={visit}
          clients={activeClients()}
          staffList={activeStaff()}
          services={activeServices()}
          defaults={{ date: visit.date }}
          week={week ?? startOfWeek(visit.date)}
        />
      </Content>
    </>
  )
}
