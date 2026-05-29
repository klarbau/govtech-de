'use client';

import { useReducer } from 'react';
import { useRouter } from 'next/navigation';

import { reseedForActivePersona } from '@/lib/mock-backend';
import { OnboardingHandshake } from '@/components/onboarding/OnboardingHandshake';
import { OnboardingPersonaSelect } from '@/components/onboarding/OnboardingPersonaSelect';
import { OnboardingTransparency } from '@/components/onboarding/OnboardingTransparency';
import { OnboardingWelcome } from '@/components/onboarding/OnboardingWelcome';

type OnboardingMethod = 'deutschlandid' | 'eudi' | 'demo';
type OnboardingStep = 'method' | 'handshake' | 'persona' | 'transparency';

interface OnboardingState {
  step: OnboardingStep;
  method?: OnboardingMethod;
  selectedPersonaId?: string;
}

type OnboardingAction =
  | { type: 'selectMethod'; method: OnboardingMethod }
  | { type: 'handshakeDone' }
  | { type: 'selectPersona'; personaId: string }
  | { type: 'back' };

function reducer(
  state: OnboardingState,
  action: OnboardingAction,
): OnboardingState {
  switch (action.type) {
    case 'selectMethod':
      return {
        ...state,
        method: action.method,
        step: action.method === 'demo' ? 'persona' : 'handshake',
      };
    case 'handshakeDone':
      return { ...state, step: 'persona' };
    case 'selectPersona':
      return { ...state, selectedPersonaId: action.personaId, step: 'transparency' };
    case 'back':
      if (state.step === 'transparency') return { ...state, step: 'persona' };
      // From handshake or persona, returning always lands back on method.
      return { ...state, step: 'method' };
    default:
      return state;
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, { step: 'method' });

  function handleConfirm() {
    if (!state.selectedPersonaId) return;
    reseedForActivePersona(state.selectedPersonaId);
    router.push('/dashboard');
  }

  return (
    <div className="flex flex-1 items-start justify-center px-4 py-10 sm:py-14">
      <div className="w-full">
        {state.step === 'method' ? (
          <OnboardingWelcome
            onSelectMethod={(method) => dispatch({ type: 'selectMethod', method })}
          />
        ) : null}

        {state.step === 'handshake' && state.method && state.method !== 'demo' ? (
          <OnboardingHandshake
            method={state.method}
            onDone={() => dispatch({ type: 'handshakeDone' })}
            onCancel={() => dispatch({ type: 'back' })}
          />
        ) : null}

        {state.step === 'persona' ? (
          <OnboardingPersonaSelect
            selectedId={state.selectedPersonaId}
            onSelect={(personaId) => dispatch({ type: 'selectPersona', personaId })}
            onBack={() => dispatch({ type: 'back' })}
          />
        ) : null}

        {state.step === 'transparency' && state.selectedPersonaId ? (
          <OnboardingTransparency
            personaId={state.selectedPersonaId}
            onBack={() => dispatch({ type: 'back' })}
            onConfirm={handleConfirm}
          />
        ) : null}
      </div>
    </div>
  );
}
