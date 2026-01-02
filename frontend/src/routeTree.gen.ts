import { Route as rootRoute } from './routes/__root';
import { Route as IndexRoute } from './routes/index';
import { Route as ScanRoute } from './routes/scan';
import { Route as LedgerRoute } from './routes/ledger';
import { Route as DashboardRoute } from './routes/dashboard';

const IndexRouteWithChildren = IndexRoute.update({
  path: '/',
  getParentRoute: () => rootRoute,
});

const ScanRouteWithChildren = ScanRoute.update({
  path: '/scan',
  getParentRoute: () => rootRoute,
});

const LedgerRouteWithChildren = LedgerRoute.update({
  path: '/ledger',
  getParentRoute: () => rootRoute,
});

const DashboardRouteWithChildren = DashboardRoute.update({
  path: '/dashboard',
  getParentRoute: () => rootRoute,
});

export const routeTree = rootRoute.addChildren([
  IndexRouteWithChildren,
  ScanRouteWithChildren,
  LedgerRouteWithChildren,
  DashboardRouteWithChildren,
]);
