import EntityClient from './EntityClient';

export const dynamic = 'force-dynamic';

export default async function EntityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EntityClient id={id} />;
}