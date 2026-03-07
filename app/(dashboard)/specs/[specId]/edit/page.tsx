import { notFound, redirect } from 'next/navigation';

interface PageProps {
  params: {
    specId: string;
  };
}

async function getSpec(specId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3500';

  try {
    const res = await fetch(`${baseUrl}/api/specs/${specId}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || json;
  } catch (error) {
    console.error('Failed to fetch spec:', error);
    return null;
  }
}

export default async function EditSpecPage({ params }: PageProps) {
  const spec = await getSpec(params.specId);

  if (!spec) {
    notFound();
  }

  // For now, redirect back to the spec detail page
  // TODO: Implement edit form
  redirect(`/specs/${params.specId}`);
}
