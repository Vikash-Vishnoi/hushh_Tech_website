/**
 * Hushh Agent App - Main Entry Point
 * 
 * This component handles authentication and renders the AgentRouter
 * for URL-based navigation between agent views.
 * 
 * Routes (handled by AgentRouter):
 * - /hushh-agent                    → Home (agent selection grid)
 * - /hushh-agent/chat               → ChatNode
 * - /hushh-agent/career             → Resume Node (vision session)
 * - /hushh-agent/career/:coachId    → Career session with specific coach
 * - /hushh-agent/session/:coachId   → Live session with any agent
 * - /hushh-agent/node/:category     → Category filter view
 */

import React from 'react';
import EmailLoginModal from './components/EmailLoginModal';
import { AgentRouter } from './routes';
import { useEmailAuth } from './hooks/useEmailAuth';

const App: React.FC = () => {
  // Email Auth Hook - handles authentication state
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    signOut,
    sendOTP,
    verifyOTP,
    isSendingOTP,
    isVerifying,
    error,
    otpSent,
    clearError,
    refreshSession,
  } = useEmailAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-white/30 text-sm uppercase tracking-[0.3em]">Initializing Neural Matrix...</p>
        </div>
      </div>
    );
  }

  // Show login modal if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020202] flex items-center justify-center">
        <EmailLoginModal 
          isOpen={true} 
          onClose={() => {}}
          onLoginSuccess={refreshSession}
          sendOTP={sendOTP}
          verifyOTP={verifyOTP}
          isSendingOTP={isSendingOTP}
          isVerifying={isVerifying}
          error={error}
          otpSent={otpSent}
          clearError={clearError}
        />
      </div>
    );
  }

  // Authenticated - render router with immersive background
  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-rose-500/30 overflow-x-hidden">
      {/* Immersive Neural Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-900/10 rounded-full blur-[180px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-blue-900/10 rounded-full blur-[180px] animate-pulse"></div>
        <div className="absolute top-[30%] left-[20%] w-[50%] h-[50%] bg-rose-900/10 rounded-full blur-[140px]"></div>
        <div className="absolute inset-0 portal-bg opacity-40"></div>
      </div>

      {/* Router handles all navigation */}
      <AgentRouter
        userEmail={user?.email}
        userId={user?.id}
        onSignOut={signOut}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
};

export default App;
