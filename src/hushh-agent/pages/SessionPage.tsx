/**
 * SessionPage - Live Session with Agent
 * 
 * The live session page for any agent coach.
 * URL: /hushh-agent/session/:coachId or /hushh-agent/career/:coachId
 */

import React, { useMemo } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { COACHES } from '../constants';
import LiveSession from '../components/LiveSession';
import AgentHeader from '../components/AgentHeader';
import { AGENT_ROUTES, isValidCoachId } from '../routes';

// Chakra UI theme for agent module
const agentTheme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
});

interface SessionPageProps {
  userEmail?: string;
  onSignOut: () => void;
  isCareerSession?: boolean;
}

const SessionPage: React.FC<SessionPageProps> = ({
  userEmail,
  onSignOut,
  isCareerSession = false,
}) => {
  const navigate = useNavigate();
  const { coachId } = useParams<{ coachId: string }>();

  // Find the coach by ID
  const coach = useMemo(() => {
    if (!coachId) return null;
    return COACHES.find(c => c.id === coachId) || null;
  }, [coachId]);

  // Validate coach ID
  if (!coachId || !isValidCoachId(coachId) || !coach) {
    // Redirect to home if invalid coach
    return <Navigate to={AGENT_ROUTES.HOME} replace />;
  }

  // Navigate to home
  const handleHomeClick = () => {
    navigate(AGENT_ROUTES.HOME);
  };

  // Navigate to career page (for career sessions to go back to coach selection)
  const handleClose = () => {
    if (isCareerSession) {
      // For career sessions, go back to career coach selection
      navigate(AGENT_ROUTES.CAREER);
    } else {
      // For other sessions, go to home
      navigate(AGENT_ROUTES.HOME);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-rose-500/30 overflow-x-hidden">
      {/* Immersive Neural Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-900/10 rounded-full blur-[180px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-blue-900/10 rounded-full blur-[180px] animate-pulse"></div>
        <div className="absolute top-[30%] left-[20%] w-[50%] h-[50%] bg-rose-900/10 rounded-full blur-[140px]"></div>
        <div className="absolute inset-0 portal-bg opacity-40"></div>
      </div>

      <ChakraProvider theme={agentTheme}>
        <AgentHeader
          currentNode={coach.category}
          userEmail={userEmail}
          onHomeClick={handleHomeClick}
          onSignOut={onSignOut}
          coachName={coach.name}
        />
        <LiveSession 
          coach={coach} 
          onClose={handleClose}
          showHeader={false}
        />
      </ChakraProvider>
    </div>
  );
};

export default SessionPage;
