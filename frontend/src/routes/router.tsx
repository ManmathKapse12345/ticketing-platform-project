import { createBrowserRouter } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { GuestOnly, RequireAuth, RequirePlatformAdmin } from "@/features/auth/Guards";
import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";
import VerifyEmailPage from "@/features/auth/VerifyEmailPage";
import ForgotPasswordPage from "@/features/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/ResetPasswordPage";
import ProfilePage from "@/features/auth/ProfilePage";
import HomePage from "@/features/events/HomePage";
import EventDetailPage from "@/features/events/EventDetailPage";
import CheckoutPage from "@/features/orders/CheckoutPage";
import MyOrdersPage from "@/features/orders/MyOrdersPage";
import OrderDetailPage from "@/features/orders/OrderDetailPage";
import MyTicketsPage from "@/features/tickets/MyTicketsPage";
import TicketDetailPage from "@/features/tickets/TicketDetailPage";
import InviteRegisterPage from "@/features/org/InviteRegisterPage";
import InviteAcceptPage from "@/features/org/InviteAcceptPage";
import OrgIndexPage from "@/features/org/OrgIndexPage";
import { RequireOrgRole } from "@/features/auth/Guards";
import { OrgLayout } from "@/features/org/OrgLayout";
import { Navigate } from "react-router-dom";
import OrgEventsPage from "@/features/org/OrgEventsPage";
import OrgEventPage from "@/features/org/OrgEventPage";
import MembersPage from "@/features/org/MembersPage";
import OrgSettingsPage from "@/features/org/OrgSettingsPage";
import EventFormPage from "@/features/org/EventFormPage";
import OrgOrderPage from "@/features/org/OrgOrderPage";
import OrgOrdersPage from "@/features/org/OrgOrdersPage";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/events/:eventId", element: <EventDetailPage /> },
      { path: "/verify-email", element: <VerifyEmailPage /> }, // matches the backend's verifyUrl
      { path: "/reset_password/:token", element: <ResetPasswordPage /> }, // matches the backend's resetUrl (underscore!)
      {
        element: <GuestOnly />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/register", element: <RegisterPage /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
        ],
      },
      { path: "/invite/:token/register", element: <InviteRegisterPage /> },

      {
        element: <RequireAuth />,
        children: [
          { path: "/profile", element: <ProfilePage /> },
          {
            element: <RequirePlatformAdmin />,
            children: [
              { path: "/admin", element: <div className="p-8">Admin dashboard (Phase 6)</div> },
            ],
          },
          { path: "/invite/:token/accept", element: <InviteAcceptPage /> },
          { path: "/org", element: <OrgIndexPage /> },
          {
            path: "/org/:organizationId",
            element: <RequireOrgRole min="viewer" />,
            children: [
              {
                element: <OrgLayout />,
                children: [
                  { index: true, element: <Navigate to="events" replace /> },
                  { path: "events", element: <OrgEventsPage /> },
                  { path: "events/:eventId", element: <OrgEventPage /> },
                  { path: "members", element: <MembersPage /> },
                  { path: "settings", element: <OrgSettingsPage /> },
                  {
                    element: <RequireOrgRole min="editor" />,
                    children: [
                      { path: "events/new", element: <EventFormPage /> },
                      { path: "events/:eventId/edit", element: <EventFormPage /> },
                    ],
                  },
                  {
                    element: <RequireOrgRole min="admin" />,
                    children: [
                      { path: "orders", element: <OrgOrdersPage /> },
                      { path: "orders/:orderId", element: <OrgOrderPage /> },
                    ],
                  },
                ],
              },
            ],
          },
          { path: "/checkout/:orderId", element: <CheckoutPage /> },
          { path: "/orders", element: <MyOrdersPage /> },
          { path: "/orders/:orderId", element: <OrderDetailPage /> },
          { path: "/tickets", element: <MyTicketsPage /> },
          { path: "/tickets/:ticketId", element: <TicketDetailPage /> },
        ],
      },
      { path: "*", element: <div className="p-8">Page not found</div> },
    ],
  },
]);
