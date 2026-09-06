import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LandingPage } from '@/pages/LandingPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AssociatesListPage } from '@/features/associates/AssociatesListPage'
import { AssociateFormPage } from '@/features/associates/AssociateFormPage'
import { AssociateDetailPage } from '@/features/associates/AssociateDetailPage'
import { AssociateTreePage } from '@/features/associates/tree/AssociateTreePage'
import { ReferralGeneratePage } from '@/features/referrals/ReferralGeneratePage'
import { ReferralListPage } from '@/features/referrals/ReferralListPage'
import { DownlineReportPage } from '@/features/reports/DownlineReportPage'
import { PortalDashboardPage } from '@/features/portal/PortalDashboardPage'
import { AddMemberPage } from '@/features/portal/AddMemberPage'
import { PortalTreePage } from '@/features/portal/PortalTreePage'
import { DirectsPage } from '@/features/portal/DirectsPage'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },

  // One login for both roles — the API decides which side you land on.
  { path: '/login', element: <LoginPage /> },
  { path: '/admin/login', element: <Navigate to="/login" replace /> },

  // Reachable while `mustChangePassword` is set, unlike every other route.
  {
    element: <ProtectedRoute />,
    children: [{ path: '/change-password', element: <ChangePasswordPage /> }],
  },

  {
    path: '/admin',
    element: <ProtectedRoute role="admin" />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'associates', element: <AssociatesListPage /> },
          { path: 'associates/register', element: <AssociateFormPage /> },
          { path: 'associates/tree', element: <AssociateTreePage /> },
          { path: 'associates/tree/:id', element: <AssociateTreePage /> },
          { path: 'associates/:id', element: <AssociateDetailPage /> },
          { path: 'associates/:id/edit', element: <AssociateFormPage /> },
          { path: 'referrals', element: <ReferralListPage /> },
          { path: 'referrals/generate', element: <ReferralGeneratePage /> },
          { path: 'reports/downline', element: <DownlineReportPage /> },
        ],
      },
    ],
  },

  {
    path: '/portal',
    element: <ProtectedRoute role="associate" />,
    children: [
      {
        element: <PortalLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: <PortalDashboardPage /> },
          { path: 'referrals', element: <ReferralListPage /> },
          { path: 'add-member', element: <AddMemberPage /> },
          { path: 'tree', element: <PortalTreePage /> },
          { path: 'directs', element: <DirectsPage /> },
          { path: 'downline', element: <DownlineReportPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
