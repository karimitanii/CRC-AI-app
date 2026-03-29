import { redirect } from 'next/navigation';
import { ChatPageClient } from '@/features/chat/chat-page-client';
import { getSessionUser } from '@/lib/auth';

export default async function ChatPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect('/login');
  }

  return <ChatPageClient />;
}
