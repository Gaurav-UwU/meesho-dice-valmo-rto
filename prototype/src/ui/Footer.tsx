/** Required on every screen: this is a prototype, not an official Valmo app, and the data is synthetic. */
export function Footer({ dark = false }: { readonly dark?: boolean }) {
  return (
    <footer className="proto-footer" style={dark ? { color: 'rgba(255,255,255,0.7)' } : undefined}>
      Prototype by Team GPS (IIT Bombay) for Meesho DICE 3.0. Not an official Valmo app. Synthetic data.
    </footer>
  )
}
