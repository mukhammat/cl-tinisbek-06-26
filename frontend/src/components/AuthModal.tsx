/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Language, User } from '../types';
import { TRANSLATIONS } from '../data';
import { X, User as UserIcon, LogIn, Mail, Lock, Phone, MapPin, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuthModalProps {
  currentLang: Language;
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
}

export default function AuthModal({
  currentLang,
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onLogout
}: AuthModalProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const t = (key: string) => {
    return TRANSLATIONS[key]?.[currentLang] || key;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (!email || !password) {
      setErrorMsg(currentLang === 'ru' ? 'Заполните ключевые поля!' : currentLang === 'ar' ? 'يرجى ملء جميع الحقول الأساسية!' : 'Please fill all core fields.');
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        if (!fullName || !phone) {
          setErrorMsg(currentLang === 'ru' ? 'Пожалуйста, укажите имя и телефон.' : currentLang === 'ar' ? 'يرجى إدخال الاسم الكامل ورقم الهاتف.' : 'Please enter full name and phone number.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, fullName, phone, address }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        onUpdateUser(data);
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Login failed');
        }

        onUpdateUser(data);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="auth-modal-wrapper">
        
        {/* Backdrop overlay */}
        <motion.div
          id="auth-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        />

        {/* Modal content container */}
        <motion.div
          id="auth-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-50">
            <h2 id="auth-header-title" className="text-xl font-bold text-slate-900">
              {user.isAuthenticated 
                ? t('userProfileTitle') 
                : (isRegistering ? t('authModalHeaderReg') : t('authModalHeaderLogin'))
              }
            </h2>
            <button
              id="btn-close-auth"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {user.isAuthenticated ? (
              /* Authenticated User state */
              <div className="space-y-6" id="auth-logged-in-profile">
                <div className="flex items-center gap-4 bg-teal-50/50 p-4 rounded-2xl border border-teal-100/30">
                  <div className="w-12 h-12 bg-teal-600 text-white font-bold text-lg rounded-full flex items-center justify-center">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">{t('userWelcome')}</span>
                    <h3 id="profile-fullname" className="text-base font-bold text-slate-900 leading-snug">{user.fullName}</h3>
                  </div>
                </div>

                <div className="space-y-3.5 text-sm text-slate-700">
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase font-medium">Email</p>
                      <p id="profile-email" className="font-semibold text-slate-800">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase font-medium">{t('phoneLabel')}</p>
                      <p id="profile-phone" className="font-semibold text-slate-800">{user.phone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="w-full">
                      <p className="text-[11px] text-slate-400 uppercase font-medium">{t('savedAddressLabel')}</p>
                      <input
                        id="profile-address-input"
                        type="text"
                        value={user.address}
                        onChange={(e) => onUpdateUser({ ...user, address: e.target.value })}
                        placeholder={currentLang === 'ru' ? 'Введите адрес...' : 'Enter address...'}
                        className="w-full font-semibold text-slate-800 bg-slate-50 focus:bg-white border-none py-1 px-1.5 rounded focus:ring-1 focus:ring-teal-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <button
                    id="btn-logout"
                    onClick={() => { onLogout(); onClose(); }}
                    className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 active:bg-rose-50 hover:bg-rose-50/60 font-semibold text-sm transition-colors"
                  >
                    {t('logoutBtn')}
                  </button>
                  <button
                    id="btn-close-profile"
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-colors animate-pulse"
                  >
                    {currentLang === 'ru' ? 'Закрыть' : currentLang === 'ar' ? 'إغلاق' : 'Close'}
                  </button>
                </div>
              </div>
            ) : (
              /* Auth Form state */
              <form onSubmit={handleAuthSubmit} className="space-y-4" id="auth-form">
                
                {errorMsg && (
                  <div id="auth-error" className="p-3 text-xs bg-rose-50 border border-rose-100 text-rose-600 rounded-xl font-medium">
                    ⚠️ {errorMsg}
                  </div>
                )}

                {isRegistering && (
                  <div className="space-y-1.5" id="field-fullname">
                    <label className="text-xs font-semibold text-slate-700">{t('fullNameLabel')}</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                      <input
                        id="input-fullname"
                        type="text"
                        required
                        placeholder="Алиханов Ержан"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl focus:outline-none focus:bg-white"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5" id="field-email">
                  <label className="text-xs font-semibold text-slate-700">{t('emailLabel')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                    <input
                      id="input-email"
                      type="email"
                      required
                      placeholder="example@mail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>

                {isRegistering && (
                  <div className="space-y-1.5" id="field-phone">
                    <label className="text-xs font-semibold text-slate-700">{t('phoneLabel')}</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                      <input
                        id="input-phone"
                        type="tel"
                        required
                        placeholder="+7 (777) 123-45-67"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl focus:outline-none focus:bg-white"
                      />
                    </div>
                  </div>
                )}

                {isRegistering && (
                  <div className="space-y-1.5" id="field-address">
                    <label className="text-xs font-semibold text-slate-700">{t('deliveryAddressLabel')}</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                      <input
                        id="input-address"
                        type="text"
                        placeholder="Алматы, пр. Аль-Фараби 77, кв 12"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl focus:outline-none focus:bg-white"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5" id="field-password">
                  <label className="text-xs font-semibold text-slate-700">{t('passwordLabel')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                    <input
                      id="input-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 focus:border-teal-500 rounded-xl focus:outline-none focus:bg-white"
                    />
                    <button
                      id="btn-toggle-password"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="btn-submit-auth"
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-bold text-sm rounded-xl tracking-wide shadow-md shadow-teal-100 transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : null}
                    <span>{isRegistering ? t('submitReg') : t('submitLogin')}</span>
                  </button>
                </div>

                <div className="text-center pt-3 border-t border-slate-50">
                  <button
                    id="btn-switch-auth-mode"
                    type="button"
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setErrorMsg('');
                    }}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline"
                  >
                    {isRegistering ? t('authToggleLoginMsg') : t('authToggleRegMsg')}
                  </button>
                </div>

              </form>
            )}
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
