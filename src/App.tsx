import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Public pages
import Index from "./pages/Index";
import SearchPage from "./pages/SearchPage";
import ItemDetail from "./pages/ItemDetail";
import ApiLanding from "./pages/ApiLanding";
import PricingPage from "./pages/PricingPage";
import LoginPage from "./pages/LoginPage";

// Docs pages
import DocsHome from "./pages/docs/DocsHome";
import DocsGettingStarted from "./pages/docs/DocsGettingStarted";
import DocsAuthentication from "./pages/docs/DocsAuthentication";
import DocsEndpoints from "./pages/docs/DocsEndpoints";
import DocsExamples from "./pages/docs/DocsExamples";

// Dashboard pages
import Dashboard from "./pages/dashboard/Dashboard";
import Watchlist from "./pages/dashboard/Watchlist";
import Alerts from "./pages/dashboard/Alerts";
import Account from "./pages/dashboard/Account";
import AccountApiKeys from "./pages/dashboard/AccountApiKeys";
import AccountUsage from "./pages/dashboard/AccountUsage";
import AccountBilling from "./pages/dashboard/AccountBilling";
import AccountSettings from "./pages/dashboard/AccountSettings";

// Utility pages
import StatusPage from "./pages/utility/StatusPage";
import ChangelogPage from "./pages/utility/ChangelogPage";
import TermsPage from "./pages/utility/TermsPage";
import PrivacyPage from "./pages/utility/PrivacyPage";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Index />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/item/:itemId" element={<ItemDetail />} />
          <Route path="/api" element={<ApiLanding />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Docs */}
          <Route path="/docs" element={<DocsHome />} />
          <Route path="/docs/getting-started" element={<DocsGettingStarted />} />
          <Route path="/docs/authentication" element={<DocsAuthentication />} />
          <Route path="/docs/endpoints" element={<DocsEndpoints />} />
          <Route path="/docs/examples" element={<DocsExamples />} />

          {/* Authenticated */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/account" element={<Account />} />
          <Route path="/account/api-keys" element={<AccountApiKeys />} />
          <Route path="/account/usage" element={<AccountUsage />} />
          <Route path="/account/billing" element={<AccountBilling />} />
          <Route path="/account/settings" element={<AccountSettings />} />

          {/* Utility */}
          <Route path="/status" element={<StatusPage />} />
          <Route path="/changelog" element={<ChangelogPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
