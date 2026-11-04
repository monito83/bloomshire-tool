import React from 'react';
import BloomshireCommand from './components/BloomshireCommand';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#070b14] text-white flex flex-col m-0 p-0">
      <ErrorBoundary title="Error Global en Bloomshire Tool">
        <BloomshireCommand />
      </ErrorBoundary>
    </div>
  );
}
