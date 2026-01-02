import { createFileRoute } from '@tanstack/react-router';
import { LedgerPage } from '../components/ledger/LedgerPage';

export const Route = createFileRoute('/ledger')({
  component: LedgerPage,
});
