import React, { useEffect, useRef } from 'react';
import {
  Routes,
  Route,
  useLocation
} from 'react-router-dom';

import './css/style.css';
import { ToastProvider, useToast } from './components/ToastNotification';
import { useNotifications } from './api/hooks';

// Import pages
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Fintech from './pages/Fintech';
import Customers from './pages/Customers';
import Leads from './pages/Leads';
import Projects from './pages/Projects';
import TaskCatalogue from './pages/TaskCatalogue';
import Finance from './pages/Finance';
import Invoicing from './pages/Invoicing';
import CustomersTemplate from './pages/ecommerce/Customers';
import Orders from './pages/ecommerce/Orders';
import Invoices from './pages/ecommerce/Invoices';
import Shop from './pages/ecommerce/Shop';
import Shop2 from './pages/ecommerce/Shop2';
import Product from './pages/ecommerce/Product';
import Cart from './pages/ecommerce/Cart';
import Cart2 from './pages/ecommerce/Cart2';
import Cart3 from './pages/ecommerce/Cart3';
import Pay from './pages/ecommerce/Pay';
import Campaigns from './pages/Campaigns';
import UsersTabs from './pages/community/UsersTabs';
import UsersTiles from './pages/community/UsersTiles';
import Profile from './pages/community/Profile';
import Feed from './pages/community/Feed';
import Forum from './pages/community/Forum';
import ForumPost from './pages/community/ForumPost';
import Meetups from './pages/community/Meetups';
import MeetupsPost from './pages/community/MeetupsPost';
import CreditCards from './pages/finance/CreditCards';
import Transactions from './pages/finance/Transactions';
import TransactionDetails from './pages/finance/TransactionDetails';
import JobListing from './pages/job/JobListing';
import JobPost from './pages/job/JobPost';
import CompanyProfile from './pages/job/CompanyProfile';
import Messages from './pages/Messages';
import TasksKanban from './pages/tasks/TasksKanban';
import TasksList from './pages/tasks/TasksList';
import Inbox from './pages/Inbox';
import Calendar from './pages/Calendar';
import Account from './pages/settings/Account';
import CompanyProfileSettings from './pages/settings/CompanyProfile';
import Pricing from './pages/settings/Pricing';
import Notifications from './pages/settings/Notifications';
import Apps from './pages/settings/Apps';
import Plans from './pages/settings/Plans';
import Billing from './pages/settings/Billing';
import Feedback from './pages/settings/Feedback';
import Changelog from './pages/utility/Changelog';
import Roadmap from './pages/utility/Roadmap';
import Faqs from './pages/utility/Faqs';
import EmptyState from './pages/utility/EmptyState';
import PageNotFound from './pages/utility/PageNotFound';
import Signin from './pages/Signin';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import ResetPasswordConfirm from './pages/ResetPasswordConfirm';
import Settings from './pages/Settings';
import Onboarding01 from './pages/Onboarding01';
import Onboarding02 from './pages/Onboarding02';
import Onboarding03 from './pages/Onboarding03';
import Onboarding04 from './pages/Onboarding04';
import ButtonPage from './pages/component/ButtonPage';
import FormPage from './pages/component/FormPage';
import DropdownPage from './pages/component/DropdownPage';
import AlertPage from './pages/component/AlertPage';
import ModalPage from './pages/component/ModalPage';
import PaginationPage from './pages/component/PaginationPage';
import TabsPage from './pages/component/TabsPage';
import BreadcrumbPage from './pages/component/BreadcrumbPage';
import BadgePage from './pages/component/BadgePage';
import AvatarPage from './pages/component/AvatarPage';
import TooltipPage from './pages/component/TooltipPage';
import AccordionPage from './pages/component/AccordionPage';
import IconsPage from './pages/component/IconsPage';
import ProtectedRoute from './components/ProtectedRoute';
import DocumentImport from './pages/documents/DocumentImport';
import ImportPreview from './pages/documents/ImportPreview';
import PublicSignature from './pages/PublicSignature';
import EstimateCreate from './pages/EstimateCreate';
import EstimateDetail from './pages/EstimateDetail';
import CustomerCreate from './pages/CustomerCreate';
import ProjectDetail from './pages/ProjectDetail';
import ProjectCreate from './pages/ProjectCreate';
import InvoiceDetail from './pages/InvoiceDetail';
import InvoiceCreate from './pages/InvoiceCreate';

// Notification Polling Component
function NotificationPoller() {
  const toast = useToast();
  const prevNotificationsRef = useRef([]);
  const isAuthenticated = !!localStorage.getItem('access_token');

  const { data: notifications } = useNotifications({
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!notifications?.results) return;

    const currentNotifications = notifications.results;
    const prevNotifications = prevNotificationsRef.current;

    // Find new notifications (not in previous list)
    const newNotifications = currentNotifications.filter(
      (current) => !prevNotifications.some((prev) => prev.id === current.id)
    );

    // Show toast for each new notification
    newNotifications.forEach((notification) => {
      if (notification.is_success) {
        toast.success(notification.title, 5000);
      } else if (notification.is_error) {
        toast.error(notification.title, 8000);
      } else {
        toast.info(notification.title, 5000);
      }
    });

    // Update previous notifications reference
    prevNotificationsRef.current = currentNotifications;
  }, [notifications, toast]);

  return null; // This component doesn't render anything
}

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    document.querySelector('html').style.scrollBehavior = 'auto'
    window.scroll({ top: 0 })
    document.querySelector('html').style.scrollBehavior = ''
  }, [location.pathname]); // triggered on route change

  return (
    <>
      <NotificationPoller />
      <Routes>
        {/* Public routes */}
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password-confirm" element={<ResetPasswordConfirm />} />
        <Route path="/sign/:token" element={<PublicSignature />} />

        {/* Onboarding routes - protected but skip onboarding check */}
        <Route path="/onboarding-01" element={<ProtectedRoute skipOnboardingCheck={true}><Onboarding01 /></ProtectedRoute>} />
        <Route path="/onboarding-02" element={<ProtectedRoute skipOnboardingCheck={true}><Onboarding02 /></ProtectedRoute>} />
        <Route path="/onboarding-03" element={<ProtectedRoute skipOnboardingCheck={true}><Onboarding03 /></ProtectedRoute>} />
        <Route path="/onboarding-04" element={<ProtectedRoute skipOnboardingCheck={true}><Onboarding04 /></ProtectedRoute>} />

        {/* Protected routes */}
        <Route exact path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/dashboard/fintech" element={<ProtectedRoute><Fintech /></ProtectedRoute>} />
        
        {/* Custom app routes */}
        <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
        <Route path="/customers/create" element={<ProtectedRoute><CustomerCreate /></ProtectedRoute>} />
        <Route path="/customers/edit/:id" element={<ProtectedRoute><CustomerCreate /></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
        <Route path="/projects/create" element={<ProtectedRoute><ProjectCreate /></ProtectedRoute>} />
        <Route path="/projects/edit/:id" element={<ProtectedRoute><ProjectCreate /></ProtectedRoute>} />
        <Route path="/projects/task-catalogue" element={<ProtectedRoute><TaskCatalogue /></ProtectedRoute>} />
        <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
        <Route path="/invoicing" element={<ProtectedRoute><Invoicing /></ProtectedRoute>} />
        <Route path="/invoicing/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
        <Route path="/invoicing/invoices/create" element={<ProtectedRoute><InvoiceCreate /></ProtectedRoute>} />
        <Route path="/invoicing/invoices/edit/:id" element={<ProtectedRoute><InvoiceCreate /></ProtectedRoute>} />
        <Route path="/invoicing/estimates/create" element={<ProtectedRoute><EstimateCreate /></ProtectedRoute>} />
        <Route path="/invoicing/estimates/:id" element={<ProtectedRoute><EstimateDetail /></ProtectedRoute>} />
        <Route path="/invoicing/estimates/edit/:id" element={<ProtectedRoute><EstimateCreate /></ProtectedRoute>} />

        {/* Document Processing & AI Import routes */}
        <Route path="/documents/import" element={<ProtectedRoute><DocumentImport /></ProtectedRoute>} />
        <Route path="/documents/preview/:documentId" element={<ProtectedRoute><ImportPreview /></ProtectedRoute>} />
        {/* Template routes */}
        <Route path="/ecommerce/customers" element={<CustomersTemplate />} />
        <Route path="/ecommerce/orders" element={<Orders />} />
        <Route path="/ecommerce/invoices" element={<Invoices />} />
        <Route path="/ecommerce/shop" element={<Shop />} />
        <Route path="/ecommerce/shop-2" element={<Shop2 />} />
        <Route path="/ecommerce/product" element={<Product />} />
        <Route path="/ecommerce/cart" element={<Cart />} />
        <Route path="/ecommerce/cart-2" element={<Cart2 />} />
        <Route path="/ecommerce/cart-3" element={<Cart3 />} />
        <Route path="/ecommerce/pay" element={<Pay />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/community/users-tabs" element={<UsersTabs />} />
        <Route path="/community/users-tiles" element={<UsersTiles />} />
        <Route path="/community/profile" element={<Profile />} />
        <Route path="/community/feed" element={<Feed />} />
        <Route path="/community/forum" element={<Forum />} />
        <Route path="/community/forum-post" element={<ForumPost />} />
        <Route path="/community/meetups" element={<Meetups />} />
        <Route path="/community/meetups-post" element={<MeetupsPost />} />
        <Route path="/finance/cards" element={<CreditCards />} />
        <Route path="/finance/transactions" element={<Transactions />} />
        <Route path="/finance/transaction-details" element={<TransactionDetails />} />
        <Route path="/job/job-listing" element={<JobListing />} />
        <Route path="/job/job-post" element={<JobPost />} />
        <Route path="/job/company-profile" element={<CompanyProfile />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/tasks/kanban" element={<TasksKanban />} />
        <Route path="/tasks/list" element={<TasksList />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/settings/company" element={<ProtectedRoute><CompanyProfileSettings /></ProtectedRoute>} />
        <Route path="/settings/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="/settings/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
        <Route path="/settings/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
        <Route path="/settings/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/settings/apps" element={<ProtectedRoute><Apps /></ProtectedRoute>} />
        <Route path="/settings/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
        <Route path="/settings/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
        <Route path="/utility/changelog" element={<Changelog />} />
        <Route path="/utility/roadmap" element={<Roadmap />} />
        <Route path="/utility/faqs" element={<Faqs />} />
        <Route path="/utility/empty-state" element={<EmptyState />} />
        <Route path="/utility/404" element={<PageNotFound />} />
        <Route path="/onboarding-01" element={<Onboarding01 />} />
        <Route path="/onboarding-02" element={<Onboarding02 />} />
        <Route path="/onboarding-03" element={<Onboarding03 />} />
        <Route path="/onboarding-04" element={<Onboarding04 />} />
        <Route path="/component/button" element={<ButtonPage />} />
        <Route path="/component/form" element={<FormPage />} />
        <Route path="/component/dropdown" element={<DropdownPage />} />
        <Route path="/component/alert" element={<AlertPage />} />
        <Route path="/component/modal" element={<ModalPage />} />
        <Route path="/component/pagination" element={<PaginationPage />} />
        <Route path="/component/tabs" element={<TabsPage />} />
        <Route path="/component/breadcrumb" element={<BreadcrumbPage />} />
        <Route path="/component/badge" element={<BadgePage />} />
        <Route path="/component/avatar" element={<AvatarPage />} />
        <Route path="/component/tooltip" element={<TooltipPage />} />
        <Route path="/component/accordion" element={<AccordionPage />} />
        <Route path="/component/icons" element={<IconsPage />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
