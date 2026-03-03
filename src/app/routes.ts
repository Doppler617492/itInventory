import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout";
import { Home } from "./pages/home";
import { Login } from "./pages/login";
import { Dashboard } from "./pages/dashboard";
import { Requests } from "./pages/requests";
import { RequestDetail } from "./pages/request-detail";
import { NewRequest } from "./pages/new-request";
import { EditRequest } from "./pages/edit-request";
import { Finance } from "./pages/finance";
import { FinanceDetail } from "./pages/finance-detail";
import { UploadInvoice } from "./pages/upload-invoice";
import { Assets } from "./pages/assets";
import { Vendors } from "./pages/vendors";
import { Subscriptions } from "./pages/subscriptions";
import { Reports } from "./pages/reports";
import { SettingsNotifications } from "./pages/settings/notifications";
import { SettingsEmail } from "./pages/settings/email";
import { SettingsUsers } from "./pages/settings/users";
import { SettingsApprovers } from "./pages/settings/approvers";
import { SettingsUsersList } from "./pages/settings/users-list";
import { SettingsRedirect } from "./components/settings-redirect";
import { NotificationsPage } from "./pages/notifications";
import { MobileLayout } from "./components/mobile-layout";
import { MobileDashboard } from "./pages/mobile/dashboard";
import { MobileRequests } from "./pages/mobile/requests";
import { MobileFinance } from "./pages/mobile/finance";
import { MobileProfile } from "./pages/mobile/profile";
import { MobileRequestDetail } from "./pages/mobile/request-detail";
import { MobileNewRequest } from "./pages/mobile/new-request";
import { MobileUploadInvoice } from "./pages/mobile/upload-invoice";

export const router = createBrowserRouter([
  {
    path: "/welcome",
    Component: Home,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "requests", Component: Requests },
      { path: "requests/new", Component: NewRequest },
      { path: "requests/:id/edit", Component: EditRequest },
      { path: "requests/:id", Component: RequestDetail },
      { path: "finance", Component: Finance },
      { path: "finance/upload", Component: UploadInvoice },
      { path: "finance/:id", Component: FinanceDetail },
      { path: "assets", Component: Assets },
      { path: "vendors", Component: Vendors },
      { path: "subscriptions", Component: Subscriptions },
      { path: "reports", Component: Reports },
      { path: "settings", Component: SettingsRedirect },
      { path: "settings/notifications", Component: SettingsNotifications },
      { path: "settings/email", Component: SettingsEmail },
      { path: "settings/approvers", Component: SettingsApprovers },
      { path: "settings/users", Component: SettingsUsers },
      { path: "settings/users-list", Component: SettingsUsersList },
      { path: "notifications", Component: NotificationsPage },
    ],
  },
  {
    path: "/mobile",
    Component: MobileLayout,
    children: [
      { index: true, Component: MobileDashboard },
      { path: "requests", Component: MobileRequests },
      { path: "requests/new", Component: MobileNewRequest },
      { path: "requests/:id/edit", Component: EditRequest },
      { path: "requests/:id", Component: MobileRequestDetail },
      { path: "finance", Component: MobileFinance },
      { path: "finance/upload", Component: MobileUploadInvoice },
      { path: "finance/:id", Component: FinanceDetail },
      { path: "profile", Component: MobileProfile },
      { path: "notifications", Component: NotificationsPage },
    ],
  },
]);