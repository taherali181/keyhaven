import { AuthShell } from '@/components/auth/AuthShell';
import { ResetPasswordForm } from '@/components/auth/RecoveryForms';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { token } = await searchParams;
  return <AuthShell eyebrow="Account recovery" title="Choose a new password" note="Pick something you haven’t used elsewhere.">
    <ResetPasswordForm token={typeof token === 'string' ? token : ''} />
  </AuthShell>;
}
