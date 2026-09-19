import { AuthShell } from '@/components/auth/AuthShell';
import { ForgotPasswordForm } from '@/components/auth/RecoveryForms';
import { accountsConfigured, resetEmailConfigured } from '@/server/auth-config';

export default function ForgotPasswordPage() {
  return <AuthShell eyebrow="Account recovery" title="Reset your password" note="We’ll send a private link that expires in 30 minutes.">
    <ForgotPasswordForm available={accountsConfigured() && resetEmailConfigured()} />
  </AuthShell>;
}
