import type { AuthError } from '@supabase/supabase-js'

/**
 * Maps Supabase auth errors to user-safe messages.
 * Genericizes credential/existence signals to prevent account enumeration,
 * but passes through actionable states (unconfirmed email, weak password,
 * rate limits).
 */
export function mapSignInError(error: AuthError): string {
  const code = error.code ?? ''
  const message = error.message.toLowerCase()

  if (code === 'email_not_confirmed' || message.includes('not confirmed')) {
    return 'กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ ตรวจสอบลิงก์ยืนยันในกล่องจดหมายของคุณ'
  }
  if (code === 'over_request_rate_limit' || message.includes('rate limit')) {
    return 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่'
  }
  if (code === 'invalid_credentials' || message.includes('invalid login')) {
    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  }
  return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
}

export function mapSignUpError(error: AuthError): string {
  const code = error.code ?? ''
  const message = error.message.toLowerCase()

  if (code === 'weak_password' || message.includes('password')) {
    return 'รหัสผ่านคาดเดาง่ายเกินไป ใช้อย่างน้อย 8 ตัวอักษร ผสมตัวอักษรและตัวเลข'
  }
  if (code === 'user_already_exists' || message.includes('already registered')) {
    return 'อาจมีบัญชีที่ใช้อีเมลนี้อยู่แล้ว ลองเข้าสู่ระบบแทน'
  }
  if (code === 'over_email_send_rate_limit' || message.includes('rate limit')) {
    return 'สมัครสมาชิกบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่'
  }
  if (code === 'email_address_invalid' || message.includes('invalid')) {
    return 'กรุณากรอกอีเมลให้ถูกต้อง'
  }
  return 'ไม่สามารถสร้างบัญชีได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
}
