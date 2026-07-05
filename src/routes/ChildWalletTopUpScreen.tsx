import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AppShell,
  Banner,
  Button,
  Card,
  ErrorState,
  Icon,
  MobileTabBar,
  QuickAmounts,
  Sidebar,
  Spinner,
  Topbar,
} from '@/components'
import { getActiveContext, type ActiveChild } from '@/features/child-selection/api'
import * as walletTopUpApi from '@/features/wallet-topup/api'
import { extractErrorMessage } from '@/lib/api-error'
import { PaymentStep, ResultStep } from './WalletTopUpScreen'

const QUICK_AMOUNTS = [5, 10, 15, 20, 30, 50, 75, 100]
const POLL_INTERVAL_MS = 1500
const POLL_MAX_ATTEMPTS = 6

type Step = 'amount' | 'payment' | 'result'

/**
 * Sc054ChildTopUp.tsx / Sc055Stripe.tsx / Sc056TopUpResult.tsx — a
 * Parent tops up a specific linked child's wallet (FR-029).
 *
 * Field-reconciliation decision #7: Sc054's own combined child-picker
 * is NOT reproduced here — `ChildSelectScreen.tsx` (FR-022) already
 * built and tested that exact mechanism specifically to feed this
 * ticket. This screen receives `?childId=` from the URL (set by
 * `ChildSelectScreen`'s own navigation, or directly from a per-child
 * "Top up" action already knowing the id) and only has its own
 * `amount` step; `payment`/`result` reuse `WalletTopUpScreen.tsx`'s
 * own exported `PaymentStep`/`ResultStep` unmodified in mechanism,
 * with child-aware copy only.
 */
export function ChildWalletTopUpScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const childId = searchParams.get('childId')
  const [children, setChildren] = useState<ActiveChild[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [step, setStep] = useState<Step>('amount')
  const [amount, setAmount] = useState(20)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [topUp, setTopUp] = useState<walletTopUpApi.StartTopUpResult | null>(null)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [result, setResult] = useState<walletTopUpApi.TopUpStatus | null>(null)
  const [stillProcessing, setStillProcessing] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)

  useEffect(() => {
    getActiveContext()
      .then((result) => setChildren(result))
      .catch((err: unknown) => {
        setLoadError(extractErrorMessage(err, 'Your children could not be loaded.'))
      })
  }, [])

  const child = children?.find((c) => c.student_id === childId) ?? null

  async function pollForResult(transactionId: string, targetStudentId: string) {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      const status = await walletTopUpApi.getChildTopUpStatus(targetStudentId, transactionId)
      if (status.status !== 'pending') {
        setResult(status)
        setStillProcessing(false)
        return
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }
    setStillProcessing(true)
  }

  async function handleStartPayment() {
    if (!child) return
    setError(null)
    setStarting(true)
    try {
      const started = await walletTopUpApi.startChildTopUp(child.student_id, amount)
      setTopUp(started)
      setStripePromise(loadStripe(started.publishable_key))
      setStep('payment')
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to start this top-up. Please try again.'))
    } finally {
      setStarting(false)
    }
  }

  async function handleCheckStatus() {
    if (!topUp || !child) return
    setCheckingStatus(true)
    try {
      await pollForResult(topUp.transaction_id, child.student_id)
    } finally {
      setCheckingStatus(false)
    }
  }

  function handlePaymentOutcome(status: walletTopUpApi.TopUpStatus | null) {
    if (status) setResult(status)
    setStep('result')
    if ((!status || status.status === 'pending') && topUp && child) {
      void pollForResult(topUp.transaction_id, child.student_id)
    }
  }

  return (
    <AppShell
      sidebar={<Sidebar brandTitle="School24" groups={[]} user={{ initials: '', name: '', role: 'Parent' }} />}
      topbar={<Topbar />}
      mobileNav={<MobileTabBar items={[]} />}
    >
      <div className="mx-auto max-w-lg">
        {step !== 'result' && (
          <button
            type="button"
            onClick={() => (step === 'amount' ? navigate('/parent/children') : setStep('amount'))}
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
          >
            <Icon name="chevronLeft" className="h-4 w-4" />{' '}
            {step === 'amount' ? 'My children' : 'Amount'}
          </button>
        )}

        {loadError ? (
          <Card className="p-6">
            <ErrorState message={loadError} />
          </Card>
        ) : !childId ? (
          <Card className="p-6">
            <ErrorState message="No child was selected. Please choose a child first." />
          </Card>
        ) : children === null ? (
          <div role="status" aria-label="Loading" className="mt-10 flex justify-center text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : !child ? (
          <Card className="p-6">
            <ErrorState message="You can only top up a child's wallet once your link to them is approved." />
          </Card>
        ) : (
          <>
            {step === 'amount' && (
              <Card className="p-6">
                <h1 className="text-xl font-bold text-ink">Top up {child.full_name}&apos;s wallet</h1>
                <p className="text-sm text-muted">
                  Add funds directly to {child.full_name}&apos;s own wallet.
                </p>

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
                <PaymentStep
                  amount={amount}
                  subtitle={`Topping up $${amount}.00 to ${child.full_name}'s wallet.`}
                  onOutcome={handlePaymentOutcome}
                />
              </Elements>
            )}

            {step === 'result' && (
              <ResultStep
                amount={amount}
                result={result}
                stillProcessing={stillProcessing}
                checkingStatus={checkingStatus}
                successMessage={`$${amount}.00 has been added to ${child.full_name}'s wallet.`}
                onCheckStatus={handleCheckStatus}
                onDone={() => navigate('/parent/children')}
                onTryAgain={() => {
                  setStep('amount')
                  setResult(null)
                  setStillProcessing(false)
                  setTopUp(null)
                }}
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
