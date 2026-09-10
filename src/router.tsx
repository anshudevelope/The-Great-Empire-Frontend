import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LandingPage } from '@/pages/LandingPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { AdminLoginPage } from '@/features/auth/AdminLoginPage'
import { AssociateLoginPage } from '@/features/auth/AssociateLoginPage'
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AssociatesListPage } from '@/features/associates/AssociatesListPage'
import { AssociateFormPage } from '@/features/associates/AssociateFormPage'
import { AssociateDetailPage } from '@/features/associates/AssociateDetailPage'
import { AssociateTreePage } from '@/features/associates/tree/AssociateTreePage'
import { ReferralListPage } from '@/features/referrals/ReferralListPage'
import { ReferralGeneratePage } from '@/features/referrals/ReferralGeneratePage'
import { DownlineReportPage } from '@/features/reports/DownlineReportPage'
import { InvoiceListPage } from '@/features/invoices/InvoiceListPage'
import { InvoiceDetailPage } from '@/features/invoices/InvoiceDetailPage'
import { PortalDashboardPage } from '@/features/portal/PortalDashboardPage'
import { PlaceMembersPage } from '@/features/portal/PlaceMembersPage'
import { PortalTreePage } from '@/features/portal/PortalTreePage'
import { DirectsPage } from '@/features/portal/DirectsPage'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },

  // Separate doors for staff and members. Both post to the same endpoint —
  // the split is branding and routing, never authorisation, which the API and
  // the role-guarded branches below still enforce.
  { path: '/admin/login', element: <AdminLoginPage /> },
  { path: '/associate/login', element: <AssociateLoginPage /> },
  // Legacy links and bookmarks.
  { path: '/login', element: <Navigate to="/associate/login" replace /> },

  // Either role.
  {
    element: <ProtectedRoute />,
    children: [{ path: '/change-password', element: <ChangePasswordPage /> }],
  },

  {
    path: '/admin',
    element: <ProtectedRoute role="admin" loginPath="/admin/login" />,
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
          // For members registered without a sponsor — no PIN.
          { path: 'referrals/generate', element: <ReferralGeneratePage /> },
          { path: 'invoices', element: <InvoiceListPage /> },
          { path: 'invoices/:id', element: <InvoiceDetailPage /> },
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
          { path: 'invoices', element: <InvoiceListPage /> },
          { path: 'invoices/:id', element: <InvoiceDetailPage /> },
          // Only the admin registers associates; the sponsor's job is placement.
          { path: 'place-members', element: <PlaceMembersPage /> },
          { path: 'add-member', element: <Navigate to="/portal/place-members" replace /> },
          { path: 'tree', element: <PortalTreePage /> },
          { path: 'directs', element: <DirectsPage /> },
          { path: 'downline', element: <DownlineReportPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
