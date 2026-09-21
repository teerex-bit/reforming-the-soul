import './styles/globals.css';

export const metadata = {
  title: 'Reforming the Soul',
  description: 'A formation practice for noticing, reflecting, and returning.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
