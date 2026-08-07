import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pitch Coach',
  description:
    'Practise impromptu speaking, interviews, pitches, and scripted delivery on camera. Claude scores each take against your own topic and knowledge base.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets the video preview sit under the notch on iPhone rather than beside it.
  viewportFit: 'cover',
  themeColor: '#10100e',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
