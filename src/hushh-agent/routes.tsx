/**
 * Hushh Agent Routes Configuration
 * 
 * Complete routing system for the hushh-agent module.
 * Routes are relative to /hushh-agent base path.
 * 
 * Route Structure:
 * - /hushh-agent                    → Home (agent selection grid)
 * - /hushh-agent/chat               → ChatNode
 * - /hushh-agent/career             → Resume Node (vision session / coach selection)
 * - /hushh-agent/career/:coachId    → Career session with specific coach (victor, sophia)
 * - /hushh-agent/session/:coachId   → Live session with any agent
 * - /hushh-agent/node/:category     → Category filter view (biological, automation, dating)
 */

import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load pages for better performance
const HomePage = lazy(() => import('./pages/HomePage'));
const ChatNodePage = lazy(() => import('./pages/ChatNodePage'));
const CareerNodePage = lazy(() => import('./pages/CareerNodePage'));
const SessionPage = lazy(() => import('./pages/SessionPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));

// Loading component for suspense fallback
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-[#020202] flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
      <p className="text-white/30 text-sm uppercase tracking-[0.3em]">Initializing Neural Matrix...</p>
    </div>
  </div>
);

// Route path constants for programmatic navigation
export const AGENT_ROUTES = {
  HOME: '/hushh-agent',
  CHAT: '/hushh-agent/chat',
  CAREER: '/hushh-agent/career',
  CAREER_SESSION: (coachId: string) => `/hushh-agent/career/${coachId}`,
  SESSION: (coachId: string) => `/hushh-agent/session/${coachId}`,
  CATEGORY: (category: string) => `/hushh-agent/node/${category}`,
} as const;

// Valid categories for routing
export const VALID_CATEGORIES = ['biological', 'automation', 'dating'] as const;
export type AgentCategory = typeof VALID_CATEGORIES[number] | 'career' | 'all';

// Valid coach IDs for routing
export const VALID_COACH_IDS = [
  'victor', 'sophia', 'luna', 'maya', 'elena', 'leo', 'aria', 'xavier', 'iris'
] as const;
export type CoachId = typeof VALID_COACH_IDS[number];

// Helper to validate coach ID
export const isValidCoachId = (id: string): id is CoachId => {
  return VALID_COACH_IDS.includes(id as CoachId);
};

// Helper to validate category
export const isValidCategory = (category: string): category is AgentCategory => {
  return VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number]) || 
         category === 'career' || 
         category === 'all';
};

// Agent Router Component
interface AgentRouterProps {
  userEmail?: string;
  userId?: string;
  onSignOut: () => void;
  isAuthenticated: boolean;
}

export const AgentRouter: React.FC<AgentRouterProps> = ({
  userEmail,
  userId,
  onSignOut,
  isAuthenticated,
}) => {
  // If not authenticated, these routes won't be rendered (handled by parent)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Home - Agent Selection Grid */}
        <Route 
          index 
          element={
            <HomePage 
              userEmail={userEmail}
              onSignOut={onSignOut}
            />
          } 
        />

        {/* ChatNode */}
        <Route 
          path="chat" 
          element={
            <ChatNodePage 
              userEmail={userEmail}
              onSignOut={onSignOut}
            />
          } 
        />

        {/* Career Node - Vision Session (coach selection) */}
        <Route 
          path="career" 
          element={
            <CareerNodePage 
              userEmail={userEmail}
              userId={userId}
              onSignOut={onSignOut}
            />
          } 
        />

        {/* Career Session with specific coach */}
        <Route 
          path="career/:coachId" 
          element={
            <SessionPage 
              userEmail={userEmail}
              onSignOut={onSignOut}
              isCareerSession
            />
          } 
        />

        {/* Live Session with any agent */}
        <Route 
          path="session/:coachId" 
          element={
            <SessionPage 
              userEmail={userEmail}
              onSignOut={onSignOut}
            />
          } 
        />

        {/* Category Filter View */}
        <Route 
          path="node/:category" 
          element={
            <CategoryPage 
              userEmail={userEmail}
              onSignOut={onSignOut}
            />
          } 
        />

        {/* Catch-all redirect to home */}
        <Route path="*" element={<Navigate to="/hushh-agent" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AgentRouter;
