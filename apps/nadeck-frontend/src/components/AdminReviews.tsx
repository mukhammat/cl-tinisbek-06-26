/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Edit2, Eye, EyeOff, Star, Trash2 } from 'lucide-react';
import { Language, Review } from '../types';

interface AdminReviewsProps {
  currentLang: Language;
  token?: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({ author: '', text: '', rating: 5, date: today(), isVerified: true });

// The "Reviews" tab of the admin panel: the customer reviews carousel on the landing page.
export default function AdminReviews({ currentLang, token }: AdminReviewsProps) {
  const ru = currentLang === 'ru';
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/reviews', { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch((err) => setError(String(err.message || err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const request = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, {
      method,
      headers: { ...authHeaders, ...(body !== undefined && { 'Content-Type': 'application/json' }) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message || `HTTP ${res.status}`);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingId) await request(`/api/admin/reviews/${editingId}`, 'PUT', form);
      else await request('/api/admin/reviews', 'POST', form);
      setForm(emptyForm());
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setForm({ author: review.author, text: review.text, rating: review.rating, date: review.date, isVerified: review.isVerified });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (review: Review) => {
    if (!window.confirm(ru ? `Удалить отзыв от «${review.author}»?` : `Delete the review by "${review.author}"?`)) return;
    try {
      await request(`/api/admin/reviews/${review.id}`, 'DELETE');
    } catch (err: any) {
      setError(String(err?.message || err));
    }
    load();
  };

  const toggle = async (review: Review) => {
    try {
      await request(`/api/admin/reviews/${review.id}`, 'PUT', { isActive: !review.isActive });
    } catch (err: any) {
      setError(String(err?.message || err));
    }
    load();
  };

  // Swap position with the neighbour.
  const move = async (index: number, delta: -1 | 1) => {
    const a = reviews[index];
    const b = reviews[index + delta];
    if (!a || !b) return;
    try {
      await Promise.all([
        request(`/api/admin/reviews/${a.id}`, 'PUT', { sortOrder: index + delta }),
        request(`/api/admin/reviews/${b.id}`, 'PUT', { sortOrder: index }),
      ]);
    } catch (err: any) {
      setError(String(err?.message || err));
    }
    load();
  };

  const inputClass = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-nadeck-500 focus:outline-none bg-white';

  return (
    <div className="space-y-8" id="view-admin-reviews">
      <form onSubmit={handleSubmit} className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
        <h3 className="text-sm font-bold text-slate-800">
          {editingId ? (ru ? 'Изменить отзыв' : 'Edit review') : (ru ? 'Добавить отзыв' : 'Add a review')}
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="space-y-1.5 text-xs font-semibold text-slate-600">
            <span>{ru ? 'Имя' : 'Name'} *</span>
            <input required maxLength={80} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className={inputClass} />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-600">
            <span>{ru ? 'Дата отзыва' : 'Review date'} *</span>
            <input required type="date" max={today()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          </label>
          <fieldset className="space-y-1.5 text-xs font-semibold text-slate-600">
            <legend className="mb-1.5">{ru ? 'Оценка' : 'Rating'}</legend>
            <div className="flex gap-1 h-[42px] items-center">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, rating: n })}
                  aria-label={`${n}`}
                  aria-pressed={form.rating === n}
                  className="w-8 h-8 flex items-center justify-center"
                >
                  <Star className={`w-6 h-6 ${n <= form.rating ? 'fill-[#f7b81b] text-[#f7b81b]' : 'fill-slate-200 text-slate-300'}`} />
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
          <span>{ru ? 'Текст отзыва' : 'Review text'} *</span>
          <textarea required rows={4} maxLength={3000} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} className={inputClass} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.isVerified} onChange={(e) => setForm({ ...form, isVerified: e.target.checked })} className="w-4 h-4" />
          {ru ? 'Значок «подтверждённый покупатель»' : '"Verified buyer" badge'}
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="h-11 px-5 rounded-xl bg-nadeck-700 hover:bg-nadeck-800 disabled:opacity-50 text-white text-sm font-semibold">
            {editingId ? (ru ? 'Сохранить' : 'Save') : (ru ? 'Добавить' : 'Add')}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm()); }} className="h-11 px-5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700">
              {ru ? 'Отмена' : 'Cancel'}
            </button>
          )}
          {error && <span className="text-xs font-semibold text-rose-600">{error}</span>}
        </div>
      </form>

      {loading && reviews.length === 0 ? (
        <p className="text-sm text-slate-500">{ru ? 'Загрузка…' : 'Loading…'}</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-slate-500">{ru ? 'Отзывов пока нет — блок на сайте скрыт.' : 'No reviews yet - the block is hidden on the site.'}</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review, index) => (
            <div key={review.id} className={`bg-white rounded-2xl border border-slate-200 p-4 flex gap-4 items-start ${review.isActive ? '' : 'opacity-50'}`}>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900">{review.author}</span>
                  {review.isVerified && <span className="text-[10px] font-bold uppercase text-[#9c7f52]">{ru ? 'проверен' : 'verified'}</span>}
                  <span className="text-xs text-slate-500">{review.date}</span>
                  <span className="text-xs text-amber-500">{'★'.repeat(review.rating)}<span className="text-slate-300">{'★'.repeat(5 - review.rating)}</span></span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{review.text}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={ru ? 'Выше' : 'Move up'} className="w-8 h-8 rounded-lg hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center"><ArrowUp className="w-4 h-4" /></button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === reviews.length - 1} aria-label={ru ? 'Ниже' : 'Move down'} className="w-8 h-8 rounded-lg hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center"><ArrowDown className="w-4 h-4" /></button>
                <button type="button" onClick={() => startEdit(review)} aria-label={ru ? 'Изменить' : 'Edit'} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><Edit2 className="w-4 h-4" /></button>
                <button type="button" onClick={() => toggle(review)} aria-label={review.isActive ? (ru ? 'Скрыть' : 'Hide') : (ru ? 'Показать' : 'Show')} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  {review.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button type="button" onClick={() => handleDelete(review)} aria-label={ru ? 'Удалить' : 'Delete'} className="w-8 h-8 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
