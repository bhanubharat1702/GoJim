'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import IncomesTab from './IncomesTab';
import ExpensesTab from './ExpensesTab';
import SalariesTab from './SalariesTab';
import ExpenseCategoriesTab from './ExpenseCategoriesTab';
import { Loader } from '@/components/UI';

function PaymentsContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'incomes';

  const category = searchParams.get('category');

  if (tab === 'expenses') {
    if (category === 'salaries') {
      return <SalariesTab />;
    }
    return <ExpensesTab />;
  }

  if (tab === 'expense-categories') {
    return <ExpenseCategoriesTab />;
  }

  return <IncomesTab />;
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<Loader />}>
      <PaymentsContent />
    </Suspense>
  );
}
