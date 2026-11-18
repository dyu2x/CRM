import React, { useState } from 'react';
import { Eye, EyeOff, Lock, AlertCircle } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const LoginPage: React.FC = () => {
  const { branding, login } = useCRM();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.message || 'Authentication failed');
      }
    } catch {
      setError('An unexpected error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };


  const initialLetter = (branding.company_name || 'Mesina Farms').trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-sans selection:bg-neutral-800 selection:text-white bg-black">
      {/* Left Column: Dark Minimalist Hero (Matches Screenshot) */}
      <div className="login-scenic-panel relative isolate w-full md:w-1/2 text-white p-8 md:p-16 flex flex-col justify-between min-h-[380px] md:min-h-screen border-b md:border-b-0 md:border-r border-neutral-900" style={{backgroundImage:`linear-gradient(90deg,rgba(0,0,0,.62),rgba(0,0,0,.18)),url(\"${branding.login_background_image === undefined ? '/login-golden-gate.png' : branding.login_background_image}\")`}}>
        {/* Brand / Logo Top */}
        <div className="flex items-center gap-3">
          {branding.company_logo ? (
            <img
              src={branding.company_logo}
              alt={branding.company_name}
              className="w-7 h-7 object-contain rounded"
            />
          ) : (
            <div className="w-6 h-6 flex items-center justify-center text-sm font-semibold text-white tracking-wider">
              {initialLetter}
            </div>
          )}
          <span className="font-medium text-sm md:text-base tracking-normal text-neutral-100">
            {branding.company_name || 'Mesina Farms'}
          </span>
        </div>

        {/* Center Headline */}
        <div className="py-12 md:py-0 max-w-lg">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]">
            {branding.tagline ? (
              branding.tagline.includes('and') ? (
                <>
                  {branding.tagline.split('and')[0]}and
                  <br />
                  {branding.tagline.split('and')[1]}
                </>
              ) : (
                branding.tagline
              )
            ) : (
              <>
                Orders, deliveries and
                <br />
                follow-ups in one place.
              </>
            )}
          </h1>
          <p className="text-neutral-400 text-sm md:text-base mt-4 font-normal leading-relaxed">
            {branding.subtitle || 'Track every farm from first order to collected payment.'}
          </p>
        </div>

      </div>

      {/* Right Column: Clean White Login Card (Matches Screenshot) */}
      <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-6 sm:p-12 md:p-16">
        <div className="w-full max-w-[360px] mx-auto">
          {/* Lock Icon */}
          <div className="mb-6">
            <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800">
              <Lock className="w-4 h-4 text-neutral-700" strokeWidth={2.2} />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">
            {branding.login_heading || 'Welcome back'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 mb-8">
            {branding.login_description || 'Sign in with your username and password.'}
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-medium text-neutral-700 mb-1.5"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm text-neutral-900 border border-neutral-300 rounded-md shadow-xs focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-neutral-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm text-neutral-900 border border-neutral-300 rounded-md shadow-xs focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 transition"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-black hover:bg-neutral-800 text-white font-medium rounded-md text-sm transition focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isLoading ? 'Signing in...' : 'Log in'}
            </button>
          </form>

          {/* Subtext */}
          <p className="mt-8 text-xs text-neutral-500 text-center leading-normal">
            Forgot your password? Ask an administrator to reset it.
          </p>


          {branding.login_footer && <p className="text-[11px] text-neutral-400 text-center mt-6">{branding.login_footer}</p>}
        </div>
      </div>
    </div>
  );
};
