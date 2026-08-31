import { create } from 'zustand'

interface UIState {
  mobileSidebarOpen: boolean
  sidebarCollapsed: boolean
  openMobileSidebar: () => void
  closeMobileSidebar: () => void
  toggleSidebarCollapsed: () => void
}

export const useUIStore = create<UIState>((set) => ({
  mobileSidebarOpen: false,
  sidebarCollapsed: false,
  openMobileSidebar: () => set({ mobileSidebarOpen: true }),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))
