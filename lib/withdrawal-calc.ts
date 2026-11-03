/**
 * Withdrawal deduction rules, shared by the client preview (confirmation
 * dialog) and the server action so both always agree.
 *
 * - Withholding tax (ภาษีหัก ณ ที่จ่าย): 3% of the gross amount, applied only
 *   when the gross amount is 1,000 THB or more. Below that, no tax is withheld.
 * - Withdrawal fee (ค่าธรรมเนียมการถอน): a flat 5 THB on every withdrawal.
 * - Net payout: gross minus tax minus fee — the amount actually transferred.
 */

export const WHT_RATE = 0.03
export const WHT_THRESHOLD = 1000
export const WITHDRAWAL_FEE = 5

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export type WithdrawalBreakdown = {
  /** Requested amount, deducted from the available balance. */
  gross: number
  /** Withholding tax withheld (0 when below the threshold). */
  wht: number
  /** Whether withholding tax applied. */
  taxable: boolean
  /** Flat withdrawal fee. */
  fee: number
  /** Amount actually paid out after deductions. */
  net: number
}

export function calculateWithdrawal(grossAmount: number): WithdrawalBreakdown {
  const gross = round2(Math.max(0, grossAmount))
  const taxable = gross >= WHT_THRESHOLD
  const wht = taxable ? round2(gross * WHT_RATE) : 0
  const fee = WITHDRAWAL_FEE
  const net = round2(Math.max(0, gross - wht - fee))
  return { gross, wht, taxable, fee, net }
}
