import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect the root path directly to our authenticated login page
  redirect('/login');
}
