'use client';

import { useSidebar } from '../contexts/SidebarContext';

interface MainContentProps {
  children: React.ReactNode;
}

export default function MainContent({ children }: MainContentProps) {
  const { collapsed } = useSidebar();
  
  return (
    <div 
      className="flex-1 flex flex-col transition-all duration-300"
      style={{ marginLeft: collapsed ? '64px' : '256px' }}
    >
      {children}
    </div>
  );
}
