'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, type AuthState } from '../services/auth'
import { Loader2, Tractor } from 'lucide-react'

const initialState: AuthState = {}

const PARTICLES = [
  { size: 3, left: 12, top: 18, duration: 9,  delay: 0   },
  { size: 4, left: 28, top: 72, duration: 13, delay: 2   },
  { size: 2, left: 54, top: 12, duration: 11, delay: 4.5 },
  { size: 5, left: 68, top: 82, duration: 8,  delay: 1   },
  { size: 3, left: 84, top: 38, duration: 12, delay: 3   },
  { size: 4, left: 20, top: 52, duration: 7,  delay: 5.5 },
  { size: 2, left: 72, top: 62, duration: 14, delay: 0.5 },
  { size: 3, left: 44, top: 90, duration: 10, delay: 6   },
  { size: 4, left: 90, top: 20, duration: 9,  delay: 2.5 },
  { size: 2, left: 38, top: 45, duration: 11, delay: 3.5 },
]

export function LoginForm() {
  const [state, action, isPending] = useActionState(login, initialState)

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ background: '#030712' }}
    >
      {/* Ambient glow orbs — pure emerald, no blue */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 600, height: 600,
          top: '-18%', right: '-12%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.09) 0%, transparent 65%)',
          borderRadius: '50%',
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          width: 440, height: 440,
          bottom: '-12%', left: '-10%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 65%)',
          borderRadius: '50%',
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          width: 240, height: 240,
          top: '40%', left: '15%',
          background: 'radial-gradient(circle, rgba(5,150,105,0.04) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full sf-particle"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.left}%`,
              top: `${p.top}%`,
              background: i % 2 === 0
                ? 'rgba(16,185,129,0.5)'
                : 'rgba(5,150,105,0.35)',
              ['--sf-duration' as string]: `${p.duration}s`,
              ['--sf-delay' as string]: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Glass card */}
      <div
        className="relative w-full max-w-sm"
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '24px',
          padding: '44px 36px 36px',
          boxShadow: '0 32px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(16,185,129,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Top shine line */}
        <div
          className="pointer-events-none absolute left-8 right-8 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)' }}
        />

        {/* Logo & title */}
        <div className="mb-9 flex flex-col items-center gap-3">
          <div
            className="sf-icon-ring flex items-center justify-center rounded-2xl text-white"
            style={{
              width: 56, height: 56,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              flexShrink: 0,
            }}
          >
            <Tractor className="h-7 w-7" />
          </div>

          <div className="text-center">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #34d399 0%, #10b981 55%, #059669 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Nortiq Farm
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: 'rgba(148,163,184,0.6)' }}
            >
              Sistema de Mantenimiento
            </p>
          </div>
        </div>

        {/* Form */}
        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              style={{ color: 'rgba(203,213,225,0.75)', fontSize: '0.8125rem' }}
            >
              Correo electrónico
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="mecánico@rancho.mx"
              required
              disabled={isPending}
              className="login-input h-11 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              style={{ color: 'rgba(203,213,225,0.75)', fontSize: '0.8125rem' }}
            >
              Contraseña
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={isPending}
              className="login-input h-11 rounded-xl"
            />
          </div>

          {state?.error && (
            <div
              className="rounded-xl px-4 py-3"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.22)',
              }}
            >
              <p className="text-sm text-red-400">{state.error}</p>
            </div>
          )}

          <div className="pt-1">
            <Button
              type="submit"
              className="login-btn w-full h-11 rounded-xl font-semibold cursor-pointer"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar al sistema'
              )}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <p
          className="mt-7 text-center text-xs"
          style={{ color: 'rgba(100,116,139,0.55)' }}
        >
          Nortiq Farm Intelligence · v1.0
        </p>
      </div>
    </div>
  )
}
