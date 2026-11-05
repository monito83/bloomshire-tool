import React from 'react';
import { useTranslation } from 'react-i18next';
import BloomshireCommand from './components/BloomshireCommand';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const { t } = useTranslation('errors');
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#070b14] text-white flex flex-col m-0 p-0">
      <ErrorBoundary title={t('boundary.globalTitle')}>
        <BloomshireCommand />
      </ErrorBoundary>
    </div>
  );
}
