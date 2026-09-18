import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/api';
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock, Sparkles } from 'lucide-react';
import { loginSchema, LoginFormData } from '@/lib/validation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { setUser } = useAuthStore();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const { data: { session, user: authUser }, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;

      const res = await authApi.syncUser({
        authId: authUser!.id,
        email: authUser!.email,
        firstName: authUser!.user_metadata?.firstName,
        lastName: authUser!.user_metadata?.lastName,
        role: authUser!.user_metadata?.role,
      });
      setUser(res.data);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || error?.error_description || 'Login failed');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[#ffac00] mb-1.5">
          <Sparkles className="h-3 w-3" />
          <span>Access Portal</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tighter text-neutral-950 dark:text-white">
          Welcome back
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          Sign in to manage your bookings, routes, or driver dispatch.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              {...register('email')}
              className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/60 pl-10 pr-4 py-3 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#ffac00] focus:ring-2 focus:ring-[#ffac00]/20 transition-all"
            />
          </div>
          {errors.email && <p className="text-[11px] font-semibold text-rose-500">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-[#ffac00] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              {...register('password')}
              className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/60 pl-10 pr-11 py-3 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#ffac00] focus:ring-2 focus:ring-[#ffac00]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-[11px] font-semibold text-rose-500">{errors.password.message}</p>}
        </div>

        {/* Submit Pill Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-neutral-950 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 font-bold py-3.5 text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 mt-2 active:scale-[0.99] disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#ffac00]" />
          ) : (
            <>
              <span>Sign In to Smart Shuttle</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Register Switcher */}
      <p className="mt-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
        Don&apos;t have an account?{' '}
        <Link
          to="/register"
          className="font-bold text-neutral-900 dark:text-white hover:text-[#ffac00] dark:hover:text-[#ffac00] underline underline-offset-4 transition-colors"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}

