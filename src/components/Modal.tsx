import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: number;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 380 
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000 }}>
      <div
        className="modal-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.45)',
          zIndex: 1000,
        }}
      />
      <div 
        className="settings-dropdown" 
        style={{
          maxWidth,
          width: '90%',
          background: '#181a20',
          borderRadius: 12,
          boxShadow: '0 4px 32px #0008',
          padding: 24,
          color: '#fff',
          zIndex: 1001,
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {title && (
          <h3 style={{ 
            margin: '0 0 16px 0', 
            fontSize: 18, 
            fontWeight: 'bold',
            borderBottom: '1px solid #333',
            paddingBottom: 8
          }}>
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
};

export default Modal;
