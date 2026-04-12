const BROWN = '#8B4513'
const BEIGE = '#FAF3E0'
const CARD_BG = '#F5ECD7'

export function OnboardingModal({ title, steps, onDone }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
      zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', boxSizing: 'border-box',
    }}>
      <div style={{
        backgroundColor: BEIGE, borderRadius: '20px', maxWidth: '360px', width: '100%',
        border: `3px solid ${BROWN}`, boxShadow: `0 6px 0 #5C2A00`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: BROWN, padding: '18px 20px 14px', textAlign: 'center',
        }}>
          <h2 style={{
            fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '22px',
            color: '#FFFFFF', margin: 0, letterSpacing: '0.5px',
          }}>
            {title}
          </h2>
        </div>

        {/* Steps */}
        <div style={{ padding: '20px 20px 8px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {steps.map((step, i) => (
            <div key={i} style={{
              backgroundColor: CARD_BG, borderRadius: '12px', padding: '14px',
              border: `2px solid #E8D5B0`, display: 'flex', gap: '12px', alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '24px', flexShrink: 0, lineHeight: 1 }}>{step.icon}</span>
              <div>
                <div style={{
                  fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '14px',
                  color: BROWN, marginBottom: '4px',
                }}>
                  {step.heading}
                </div>
                <div style={{
                  fontFamily: 'Arial, sans-serif', fontWeight: 600, fontSize: '13px',
                  color: '#5A2D0C', lineHeight: 1.4,
                }}>
                  {step.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Button */}
        <div style={{ padding: '16px 20px 20px' }}>
          <button
            style={{
              width: '100%', backgroundColor: BROWN, color: '#FFFFFF', border: 'none',
              borderRadius: '14px', padding: '14px', minHeight: '50px',
              fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: '17px',
              cursor: 'pointer', boxShadow: '0 3px 0 #5C2A00', letterSpacing: '0.5px',
            }}
            onClick={onDone}
          >
            Let's Go!
          </button>
        </div>
      </div>
    </div>
  )
}
