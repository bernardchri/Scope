'use client';

import '../styles/global.css';
import { useEffect } from 'react';
import { useProjectStore } from '@/lib/projectStore';
import { loadProjects } from '@/lib/persistence';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const setProjects = useProjectStore(state => state.setProjects);

  useEffect(() => {
    // Charger les projets au démarrage
    loadProjects().then(projects => {
      setProjects(projects);
    });
  }, [setProjects]);

  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}