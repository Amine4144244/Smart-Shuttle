import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Loader2, ArrowRight, Mail, Lock, User, Phone, Eye, EyeOff, Sparkles, CheckCircle2 } from 'lucide-react';
import { registerSchema, RegisterFormData } from '@/lib/validation';
import toast from 'react-hot-toast';

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      // 1. Register user via backend API (creates auth user with auto-confirmed email & DB record)
      const res = await authApi.register({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: 'EMPLOYEE',
      });

      // 2. Establish client-side Supabase session
      await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      }).catch(() => {});

      setUser(res.data);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Registration failed';
      toast.error(errorMsg);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[#ffac00] mb-1.5">
          <Sparkles className="h-3 w-3" />
          <span>New Passenger Account</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tighter text-neutral-950 dark:text-white">
          Create account
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          Join Smart Shuttle for instant event reservations & live tracking.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        {/* Name Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              First Name
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                <User className="h-3.5 w-3.5" />
              </div>
              <input
                id="firstName"
                placeholder="Alex"
                {...register('firstName')}
                className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/60 pl-9 pr-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#ffac00] focus:ring-2 focus:ring-[#ffac00]/20 transition-all"
              />
            </div>
            {errors.firstName && <p className="text-[10px] font-semibold text-rose-500">{errors.firstName.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Last Name
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                <User className="h-3.5 w-3.5" />
              </div>
              <input
                id="lastName"
                placeholder="Morgan"
                {...register('lastName')}
                className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/60 pl-9 pr-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#ffac00] focus:ring-2 focus:ring-[#ffac00]/20 transition-all"
              />
            </div>
            {errors.lastName && <p className="text-[10px] font-semibold text-rose-500">{errors.lastName.message}</p>}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              <Mail className="h-3.5 w-3.5" />
            </div>
            <input
              id="email"
              type="email"
              placeholder="alex@example.com"
              {...register('email')}
              className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/60 pl-9 pr-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#ffac00] focus:ring-2 focus:ring-[#ffac00]/20 transition-all"
            />
          </div>
          {errors.email && <p className="text-[10px] font-semibold text-rose-500">{errors.email.message}</p>}
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Mobile Number
            </label>
            <span className="text-[10px] text-neutral-400">Optional for SMS dispatch</span>
          </div>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              <Phone className="h-3.5 w-3.5" />
            </div>
            <input
              id="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              {...register('phone')}
              className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/60 pl-9 pr-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#ffac00] focus:ring-2 focus:ring-[#ffac00]/20 transition-all"
            />
          </div>
          {errors.phone && <p className="text-[10px] font-semibold text-rose-500">{errors.phone.message}</p>}
        </div>

        {/* Passwords Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Password
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                <Lock className="h-3.5 w-3.5" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
                className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/60 pl-9 pr-9 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#ffac00] focus:ring-2 focus:ring-[#ffac00]/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            {errors.password && <p className="text-[10px] font-semibold text-rose-500">{errors.password.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Confirm
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                <Lock className="h-3.5 w-3.5" />
              </div>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('confirmPassword')}
                className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/60 pl-9 pr-9 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#ffac00] focus:ring-2 focus:ring-[#ffac00]/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-[10px] font-semibold text-rose-500">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        {/* Submit Pill Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 font-bold py-3.5 text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 mt-4 active:scale-[0.99] disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#ffac00]" />
          ) : (
            <>
              <span>Create Free Account</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Login Switcher */}
      <p className="mt-5 text-center text-xs text-neutral-500 dark:text-neutral-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-bold text-neutral-900 dark:text-white hover:text-[#ffac00] dark:hover:text-[#ffac00] underline underline-offset-4 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

