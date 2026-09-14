import { ProfileClient } from './ProfileClient';

/**
 * Reached from the user menu, not the sidebar: it is about the signed-in person,
 * not a workspace section. Protected like every other page by proxy.ts.
 */
export default function ProfilePage() {
  return <ProfileClient />;
}
