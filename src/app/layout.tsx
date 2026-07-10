import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { TenantUserProvider } from '@/context/TenantUserContext';

export const metadata: Metadata = {
  title: 'UME Explorer',
  description:
    'Ontology graph explorer for UME — ume.people-ia.com/explore (reads from ume-management-core :3002)',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <TenantUserProvider>{children}</TenantUserProvider>
      </body>
    </html>
  );
}