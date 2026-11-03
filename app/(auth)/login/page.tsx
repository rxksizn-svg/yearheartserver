import * as React from 'react'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  )
}
