/** A tiny framework-free toast, so the store layer can tell people about a problem without importing React. */
export function showToast(message: string, ms = 5000, tone: 'error' | 'info' = 'error'): void {
  // One message of each kind at a time: a newer notice replaces the older one instead of piling on top of it.
  document.querySelectorAll(`[data-toast="${tone}"]`).forEach((old) => old.remove())
  const el = document.createElement('div')
  el.dataset.toast = tone
  el.setAttribute('role', tone === 'info' ? 'status' : 'alert')
  el.textContent = message
  Object.assign(el.style, {
    position: 'fixed',
    left: '50%',
    bottom: '24px',
    transform: 'translateX(-50%)',
    maxWidth: 'min(92vw, 460px)',
    padding: '12px 16px',
    borderRadius: '10px',
    background: tone === 'info' ? '#092d5e' : '#d93025',
    color: '#fff',
    font: '500 14px Roboto, system-ui, sans-serif',
    boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
    zIndex: '10000',
  })
  document.body.appendChild(el)
  window.setTimeout(() => el.remove(), ms)
}
