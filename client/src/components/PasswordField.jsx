import { useMemo, useState } from 'react'

function checksFor(pw) {
  const s = pw || ''
  return {
    length: s.length >= 8,
    lower: /[a-z]/.test(s),
    upper: /[A-Z]/.test(s),
    number: /\d/.test(s),
    symbol: /[^A-Za-z0-9]/.test(s),
  }
}

function strengthLabel(checks) {
  const passCount = Object.values(checks).filter(Boolean).length
  if (passCount <= 2) return { label: 'Weak', pct: 25 }
  if (passCount === 3) return { label: 'Fair', pct: 55 }
  if (passCount === 4) return { label: 'Good', pct: 80 }
  return { label: 'Strong', pct: 100 }
}

export default function PasswordField({
  label = 'Password',
  value,
  onChange,
  required,
  autoComplete = 'new-password',
  showMeter = true,
  showRules = true,
  minLength = 8,
  placeholder = '••••••••',
}) {
  const [visible, setVisible] = useState(false)

  const checks = useMemo(() => checksFor(value), [value])
  const strength = useMemo(() => strengthLabel(checks), [checks])

  const okAll = Object.values(checks).every(Boolean)

  return (
    <label>
      {label}
      <div className="pwWrap">
        <input
          value={value}
          onChange={onChange}
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={value ? (!okAll).toString() : 'false'}
        />
        <button
          type="button"
          className="pwToggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>

      {showMeter ? (
        <div className="pwMeter" title={`Strength: ${strength.label}`}>
          <div
            className={`pwMeter__bar pwMeter__bar--${strength.label.toLowerCase()}`}
            style={{ width: `${strength.pct}%` }}
          />
          <div className="pwMeter__text">
            Strength: <strong>{strength.label}</strong>
          </div>
        </div>
      ) : null}

      {showRules ? (
        <ul className="pwRules">
          <li className={checks.length ? 'ok' : ''}>At least 8 characters</li>
          <li className={checks.upper ? 'ok' : ''}>1 uppercase letter</li>
          <li className={checks.lower ? 'ok' : ''}>1 lowercase letter</li>
          <li className={checks.number ? 'ok' : ''}>1 number</li>
          <li className={checks.symbol ? 'ok' : ''}>1 symbol</li>
        </ul>
      ) : null}
    </label>
  )
}
