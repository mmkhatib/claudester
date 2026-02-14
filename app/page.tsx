import { redirect } from 'next/navigation';

export default function Home() {
  // Skip marketing page and go straight to the app
  redirect('/projects');
}
