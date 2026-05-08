interface ConfirmModalProps {
  visible: boolean;
  title?: string;
  content?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ 
  visible, 
  title, 
  content, 
  confirmText, 
  cancelText, 
  onConfirm, 
  onCancel 
}: ConfirmModalProps) {
  if (!visible) return null;

  return (
    <div 
      className="dim" 
      style={{ 
        animation: 'dimIn 0.2s ease forwards', 
        background: 'rgba(3, 5, 15, 0.65)', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        zIndex: 100 
      }} 
      onClick={onCancel}
    >
      <div 
        className="card" 
        style={{ 
          width: '85%', 
          maxWidth: 320, 
          padding: '24px 20px', 
          textAlign: 'center', 
          background: '#12223a', // Solid background to prevent text bleed-through
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' 
        }} 
        onClick={e => e.stopPropagation()}
      >
        {title && <h3 style={{ marginBottom: 12, color: '#f3f4f6', fontSize: 18, fontWeight: 600 }}>{title}</h3>}
        {content && <p style={{ color: '#9ca3af', marginBottom: 24, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{content}</p>}
        
        <div style={{ display: 'flex', gap: 12 }}>
          {cancelText && (
            <button className="btn-ghost" style={{ flex: 1, padding: '12px' }} onClick={onCancel}>
              {cancelText}
            </button>
          )}
          {confirmText && (
            <button className="btn-gold" style={{ flex: 1, padding: '12px' }} onClick={onConfirm}>
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
