/**
 * ChatNodePage - Chat Interface
 * 
 * The ChatNode page for hushh-agent module.
 * URL: /hushh-agent/chat
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import ChatNode from '../components/ChatNode';
import AgentHeader from '../components/AgentHeader';
import { AGENT_ROUTES } from '../routes';

// Chakra UI theme for agent module
const agentTheme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
});

interface ChatNodePageProps {
  userEmail?: string;
  onSignOut: () => void;
}

const ChatNodePage: React.FC<ChatNodePageProps> = ({
  userEmail,
  onSignOut,
}) => {
  const navigate = useNavigate();

  // Navigate to home
  const handleHomeClick = () => {
    navigate(AGENT_ROUTES.HOME);
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
          currentNode="chatnode"
          userEmail={userEmail}
          onHomeClick={handleHomeClick}
          onSignOut={onSignOut}
        />
        <ChatNode 
          isOpen={true} 
          onClose={handleHomeClick}
          showHeader={false}
        />
      </ChakraProvider>
    </div>
  );
};

export default ChatNodePage;
