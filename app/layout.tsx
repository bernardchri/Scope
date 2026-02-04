'use client';

import { useEffect } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { loadProjects } from '@/lib/persistence';
import { createAutoBackup } from '@/lib/backup';
import '../styles/global.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    async function init() {
      const projects = await loadProjects();
      
      // 🆕 Utiliser setState directement
      useProjectStore.setState({ projects });
      
      if (projects.length > 0) {
        await createAutoBackup(projects);
      }
    }
    init();
  }, []);

  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}