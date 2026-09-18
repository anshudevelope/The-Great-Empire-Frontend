import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LandingPage } from '@/pages/LandingPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { AdminLoginPage } from '@/features/auth/AdminLoginPage'
import { AssociateLoginPage } from '@/features/auth/AssociateLoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { AuthScopeProvider } from '@/store/AuthScopeProvider'
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
import { PayoutListPage } from '@/features/payouts/PayoutListPage'
import { PayoutGeneratePage } from '@/features/payouts/PayoutGeneratePage'
import { PayoutDetailPage } from '@/features/payouts/PayoutDetailPage'
import { MyPayoutsPage } from '@/features/portal/MyPayoutsPage'
import { MyIncomePage } from '@/features/portal/MyIncomePage'
import { PortalDashboardPage } from '@/features/portal/PortalDashboardPage'
import { PlaceMembersPage } from '@/features/portal/PlaceMembersPage'
import { PortalTreePage } from '@/features/portal/PortalTreePage'
import { DirectsPage } from '@/features/portal/DirectsPage'

// Every route sits under AuthScopeProvider, which reads the path and decides
// which of the two sessions this page belongs to. Nothing outside it may read
// auth, because outside it there is no answer to "whose session?".
export const router = createBrowserRouter([
  {
    element: <AuthScopeProvider />,
    children: [
  { path: '/', element: <LandingPage /> },

  // Two separate doors, and genuinely separate logins: each posts its own
  // audience, and the API refuses a valid password presented at the other
  // door. Signing in at one leaves the other session untouched.
  { path: '/admin/login', element: <AdminLoginPage /> },
  { path: '/associate/login', element: <AssociateLoginPage /> },
  // Legacy links and bookmarks.
  { path: '/login', element: <Navigate to="/associate/login" replace /> },

  {
    path: '/admin',
    element: <ProtectedRoute />,
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
          // 'generate' before ':id' — same shape, and Express-style ordering
          // applies to react-router's ranked matching only for literal-vs-param
          // ties, so keeping them in this order is the readable guarantee.
          { path: 'payouts', element: <PayoutListPage /> },
          { path: 'payouts/generate', element: <PayoutGeneratePage /> },
          { path: 'payouts/:id', element: <PayoutDetailPage /> },
          { path: 'reports/downline', element: <DownlineReportPage /> },
        ],
      },
    ],
  },

  {
    path: '/portal',
    element: <ProtectedRoute />,
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
          { path: 'income', element: <MyIncomePage /> },
          { path: 'payouts', element: <MyPayoutsPage /> },
          { path: 'downline', element: <DownlineReportPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
    ],
  },
])
