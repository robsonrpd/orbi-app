'use client'

import { useState, useEffect } from 'react'
import { WelcomeModal } from './welcome-modal'
import { TrialBanner } from './trial-banner'
import { PlansModal } from './plans-modal'

type Props = {
  companyName: string
  trialEndsAt: string | null
  subscriptionStatus: string
  subscriptionPlan: string | null
  isNewUser: boolean
}

export function SubscriptionManager({
  companyName, trialEndsAt, subscriptionStatus, subscriptionPlan, isNewUser
}: Props) {
  const [showWelcome, setShowWelcome] = useState(false)
  const [showPlans, setShowPlans] = useState(false)

  useEffect(() => {
    if (isNewUser) {
      const key = `welcome_shown_${companyName}`
      const shown = localStorage.getItem(key)
      if (!shown) {
        setShowWelcome(true)
        localStorage.setItem(key, '1')
      }
    }
  }, [isNewUser, companyName])

  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  const isTrial = subscriptionStatus === 'trial'

  return (
    <>
      {/* Banner de trial no topo */}
      {isTrial && daysLeft > 0 && (
        <TrialBanner daysLeft={daysLeft} onVerPlanos={() => setShowPlans(true)} />
      )}

      {/* Modal de boas-vindas — primeira vez */}
      {showWelcome && trialEndsAt && (
        <WelcomeModal
          companyName={companyName}
          trialEndsAt={trialEndsAt}
          onClose={() => setShowWelcome(false)}
        />
      )}

      {/* Modal de planos */}
      {showPlans && (
        <PlansModal
          onClose={() => setShowPlans(false)}
          currentPlan={subscriptionPlan ?? undefined}
        />
      )}
    </>
  )
}
