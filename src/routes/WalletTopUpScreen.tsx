import { loadStripe, type Stripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell,
  Banner,
  Button,
  Card,
  Icon,
  MobileTabBar,
  QuickAmounts,
  ResultHero,
  Sidebar,
  Topbar,
} from '@/components'
import * as walletTopUpApi from '@/features/wallet-topup/api'
import { extractErrorMessage } from '@/lib/api-error'

const QUICK_AMOUNTS = [5, 10, 15, 20, 30, 50, 75, 100]
const POLL_INTERVAL_MS = 1500
const POLL_MAX_ATTEMPTS = 6

type Step = 'amount' | 'payment' | 'result'

interface WalletTopUpScreenProps {
  role: 'parent' | 'student'
  displayName: string
  roleLabel: string
  backHref: string
  backLabel: string
}

/**
 * Sc052TopUp.tsx / Sc055Stripe.tsx / Sc056TopUpResult.tsx — Wallet Top-Up
 * (FR-028 Parent, FR-030 Student — shared mechanism, field-reconciliation
 * decision: one parameterized screen for both, matching the design's own
 * "shared component" note for these 3 screens).
 *
 * SC-055's own mock renders plain card-number/expiry/CVC inputs — NOT
 * rendered here. Field-reconciliation decision: the ticket's own
 * must-not ("no card data stored by the platform") and the user's own
 * explicit instruction ("real Stripe Elements, not mock plain inputs")
 * both override that inconsistent mock — Stripe's own `PaymentElement`
 * renders in its place, inside the SAME Card/copy/layout.
 *
 * No saved-payment-method UI (field-reconciliation decision #7) — every
 * top-up is a fresh PaymentIntent with fresh Elements.
 *
 * FR-029 reuses this screen's own `PaymentStep`/`ResultStep` (exported
 * below) from `ChildWalletTopUpScreen.tsx` — a Parent topping up a
 * linked child's wallet needs its own `amount` step (child-aware copy,
 * no in-screen child-picker — that's `ChildSelectScreen.tsx`'s own
 * job) but the identical Stripe confirm + result-polling mechanism,
 * never re-implemented a third time.
 */
export function WalletTopUpScreen({
  role,
  displayName,
  roleLabel,
  backHref,
  backLabel,
}: WalletTopUpScreenProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('amount')
  const [amount, setAmount] = useState(20)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [topUp, setTopUp] = useState<walletTopUpApi.StartTopUpResult | null>(null)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [result, setResult] = useState<walletTopUpApi.TopUpStatus | null>(null)
  const [stillProcessing, setStillProcessing] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)

  const startTopUp = role === 'parent' ? walletTopUpApi.startParentTopUp : walletTopUpApi.startStudentTopUp
  const getStatus =
    role === 'parent' ? walletTopUpApi.getParentTopUpStatus : walletTopUpApi.getStudentTopUpStatus

  async function handleStartPayment() {
    setError(null)
    setStarting(true)
    try {
      const started = await startTopUp(amount)
      setTopUp(started)
      setStripePromise(loadStripe(started.publishable_key))
      setStep('payment')
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to start your top-up. Please try again.'))
    } finally {
      setStarting(false)
    }
  }

  async function pollForResult(transactionId: string) {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      const status = await getStatus(transactionId)
      if (status.status !== 'pending') {
        setResult(status)
        setStillProcessing(false)
        return
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }
    // EC-020: the webhook hasn't landed yet within our bounded wait —
    // honest about the async nature rather than fabricating a result.
    setStillProcessing(true)
  }

  // Review round 4, Major finding: without this, a transaction that
  // outlasts the bounded poll above has NO code path left in the app
  // that ever checks it again — the backend's own lazy-reconciliation
  // window (10 minutes) would never actually be reached in practice.
  // Lets an engaged user manually ask again; each click is its own
  // fresh bounded poll (same pollForResult), which is also what
  // eventually crosses the backend's reconciliation threshold if the
  // user keeps checking back.
  async function handleCheckStatus() {
    if (!topUp) return
    setCheckingStatus(true)
    try {
      await pollForResult(topUp.transaction_id)
    } finally {
      setCheckingStatus(false)
    }
  }

  function handlePaymentOutcome(status: walletTopUpApi.TopUpStatus | null) {
    if (status) {
      setResult(status)
    }
    setStep('result')
    if (!status || status.status === 'pending') {
      if (topUp) void pollForResult(topUp.transaction_id)
    }
  }

  return (
    <AppShell
      sidebar={
        <Sidebar
          brandTitle="School24"
          groups={[]}
          user={{ initials: displayName.slice(0, 1).toUpperCase(), name: displayName, role: roleLabel }}
        />
      }
      topbar={<Topbar />}
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-lg">
        {step !== 'result' && (
          <button
            type="button"
            onClick={() => (step === 'amount' ? navigate(backHref) : setStep('amount'))}
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
          >
            <Icon name="chevronLeft" className="h-4 w-4" /> {step === 'amount' ? backLabel : 'Amount'}
          </button>
        )}

        {step === 'amount' && (
          <Card className="p-6">
            <h1 className="text-xl font-bold text-ink">Top up wallet</h1>
            <p className="text-sm text-muted">Add funds to your own wallet.</p>

            {error && (
              <div className="mt-4">
                <Banner tone="danger">{error}</Banner>
              </div>
            )}

            <div className="mt-6 text-center">
              <div className="text-sm text-muted">Amount</div>
              <div className="mt-1 text-4xl font-bold text-brand-deep">${amount}.00</div>
            </div>

            <div className="mt-5">
              <QuickAmounts amounts={QUICK_AMOUNTS} value={amount} onSelect={setAmount} />
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-sm">
              <span className="text-muted">You&apos;ll be charged</span>
              <span className="font-bold text-ink">${amount}.00</span>
            </div>

            <Button
              fullWidth
              className="mt-4"
              leadingIcon="lock"
              onClick={handleStartPayment}
              loading={starting}
            >
              Continue to payment
            </Button>
            <p className="mt-2 text-center text-xs text-muted">
              Secured by Stripe · funds appear once your payment is confirmed
            </p>
          </Card>
        )}

        {step === 'payment' && topUp && stripePromise && (
          <Elements stripe={stripePromise} options={{ clientSecret: topUp.client_secret }}>
            <PaymentStep amount={amount} onOutcome={handlePaymentOutcome} />
          </Elements>
        )}

        {step === 'result' && (
          <ResultStep
            amount={amount}
            result={result}
            stillProcessing={stillProcessing}
            checkingStatus={checkingStatus}
            onCheckStatus={handleCheckStatus}
            onDone={() => navigate(backHref)}
            onTryAgain={() => {
              setStep('amount')
              setResult(null)
              setStillProcessing(false)
              setTopUp(null)
            }}
          />
        )}
      </div>
    </AppShell>
  )
}

/**
 * Exported for reuse by `ChildWalletTopUpScreen.tsx` (FR-029) — the
 * same Stripe Elements confirm flow, never duplicated, per that
 * ticket's own explicit "reuse FR-028's integration" instruction.
 */
export function PaymentStep({
  amount,
  subtitle,
  onOutcome,
}: {
  amount: number
  subtitle?: string
  onOutcome: (status: walletTopUpApi.TopUpStatus | null) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [declined, setDeclined] = useState<string | null>(null)
  const submittedRef = useRef(false)

  async function handleSubmit() {
    if (!stripe || !elements || submittedRef.current) return
    submittedRef.current = true
    setDeclined(null)
    setSubmitting(true)
    try {
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      })
      if (confirmError) {
        setDeclined(confirmError.message ?? 'Your card was declined. Try a different card.')
        submittedRef.current = false
        return
      }
      // Client-side confirmation succeeded, but it is NOT authoritative
      // (EC-020) — the result screen polls the backend's own webhook-
      // driven status instead of trusting this return value directly.
      onOutcome(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">Payment</h1>
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-mint px-2.5 py-1 text-xs font-medium text-brand-deep">
          <Icon name="lock" className="h-3.5 w-3.5" /> Secured by Stripe
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">
        {subtitle ?? `Topping up $${amount}.00 to your wallet.`}
      </p>

      {declined && (
        <div className="mt-4">
          <Banner tone="danger">{declined}</Banner>
        </div>
      )}

      <div className="mt-5 space-y-4">
        <PaymentElement />
        <Button fullWidth leadingIcon="lock" onClick={handleSubmit} loading={submitting} disabled={!stripe}>
          Pay ${amount}.00
        </Button>
        <p className="text-center text-xs text-muted">
          Payments are processed securely by Stripe. School24 never sees or stores your card
          details.
        </p>
      </div>
    </Card>
  )
}

/** Exported for reuse by `ChildWalletTopUpScreen.tsx` (FR-029) — see
 * `PaymentStep`'s own docstring above for the reasoning. */
export function ResultStep({
  amount,
  result,
  stillProcessing,
  checkingStatus,
  successMessage,
  onCheckStatus,
  onDone,
  onTryAgain,
}: {
  amount: number
  result: walletTopUpApi.TopUpStatus | null
  stillProcessing: boolean
  checkingStatus: boolean
  successMessage?: string
  onCheckStatus: () => void
  onDone: () => void
  onTryAgain: () => void
}) {
  if (stillProcessing) {
    return (
      <Card className="w-full p-8 text-center">
        <p className="text-lg font-semibold text-ink">Still processing…</p>
        <p className="mt-2 text-sm text-muted">
          Your payment is being confirmed. This can take a moment — check back shortly.
        </p>
        <Button className="mt-5" fullWidth onClick={onCheckStatus} loading={checkingStatus}>
          Check status
        </Button>
        <Button className="mt-2" variant="secondary" fullWidth onClick={onDone}>
          Back to wallet
        </Button>
      </Card>
    )
  }

  if (!result) {
    return (
      <Card className="w-full p-8 text-center">
        <p className="text-sm text-muted">Confirming your payment…</p>
      </Card>
    )
  }

  const ok = result.status === 'success'

  return (
    <Card className="w-full p-8">
      <ResultHero
        ok={ok}
        title={ok ? 'Top-up successful' : 'Top-up failed'}
        message={
          ok
            ? (successMessage ?? `$${amount}.00 has been added to your wallet.`)
            : 'Your card was declined, so no charge was made. Please try a different card.'
        }
      >
        <div className="mt-2 w-full rounded-card bg-canvas p-4 text-sm">
          <div className="flex items-center justify-between py-1">
            <span className="text-muted">Amount</span>
            <span className="font-semibold text-ink">${amount}.00</span>
          </div>
          {ok && result.wallet_balance !== null && (
            <div className="flex items-center justify-between border-t border-line pt-2">
              <span className="text-muted">New balance</span>
              <span className="font-bold text-brand-deep">${result.wallet_balance.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="mt-5 flex w-full flex-col gap-2">
          {ok ? (
            <Button fullWidth onClick={onDone}>
              Back to wallet
            </Button>
          ) : (
            <>
              <Button fullWidth onClick={onTryAgain}>
                Try again
              </Button>
              <Button variant="secondary" fullWidth onClick={onDone}>
                Back to wallet
              </Button>
            </>
          )}
        </div>
      </ResultHero>
    </Card>
  )
}
