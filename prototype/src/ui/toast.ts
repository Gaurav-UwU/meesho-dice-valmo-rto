/** A tiny framework-free toast, so the store layer can tell people about a problem without importing React. */
export function showToast(message: string, ms = 5000): void {
  const el = document.createElement('div')
  el.setAttribute('role', 'alert')
  el.textContent = message
  Object.assign(el.style, {
    position: 'fixed',
    left: '50%',
    bottom: '24px',
    transform: 'translateX(-50%)',
    maxWidth: 'min(92vw, 460px)',
    padding: '12px 16px',
    borderRadius: '10px',
    background: '#d93025',
    color: '#fff',
    font: '500 14px Roboto, system-ui, sans-serif',
    boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
    zIndex: '10000',
  })
  document.body.appendChild(el)
  window.setTimeout(() => el.remove(), ms)
}
