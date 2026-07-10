import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const raw = process.env.UME_EXPLORER_ROOT_IDS ?? '';
  const envRoots = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return <HomeClient envRoots={envRoots} />;
}