/**
 * CareerNodePage - Resume Node / Vision Session
 * 
 * The Career/Resume node page for hushh-agent module.
 * Displays coach selection and neural vision session.
 * URL: /hushh-agent/career
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Coach } from '../types';
import { ResumeNodeVisionSession } from '../components/ResumeNode';
import { AGENT_ROUTES } from '../routes';

interface CareerNodePageProps {
  userEmail?: string;
  userId?: string;
  onSignOut: () => void;
}

const CareerNodePage: React.FC<CareerNodePageProps> = ({
  userEmail,
  userId,
  onSignOut,
}) => {
  const navigate = useNavigate();

  // Navigate to home
  const handleClose = () => {
    navigate(AGENT_ROUTES.HOME);
  };

  // When user proceeds to live session after vision calibration
  const handleProceedToLiveSession = (coach: Coach) => {
    // Navigate to career session with the selected coach
    navigate(AGENT_ROUTES.CAREER_SESSION(coach.id));
  };

  return (
    <ResumeNodeVisionSession 
      onClose={handleClose}
      onProceedToLiveSession={handleProceedToLiveSession}
      userEmail={userEmail}
      userId={userId}
    />
  );
};

export default CareerNodePage;
