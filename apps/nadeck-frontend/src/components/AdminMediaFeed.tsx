/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader, Trash2, Upload } from 'lucide-react';
import { Language, MediaItem } from '../types';

interface AdminMediaFeedProps {
  currentLang: Language;
  token?: string;
}

// Uploads with progress - videos are large enough that a silent fetch() looks frozen.
function uploadWithProgress(url: string, file: File, token: string | undefined, onProgress: (pct: number) => void): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data: any = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // fall through to the status check
      }
      if (xhr.status >= 200 && xhr.status < 300 && data?.url) resolve(data);
      else reject(new Error(data?.message || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error'));
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

// The "Videos & photos" tab of the admin panel: the video feed and the photo gallery under the
// catalog. A file's type decides where it goes.
export default function AdminMediaFeed({ currentLang, token }: AdminMediaFeedProps) {
  const ru = currentLang === 'ru';
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [files, setFiles] = useState<File[]>([]);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [titleRu, setTitleRu] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/media-feed', { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(String(err.message || err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const save = async (id: string, patch: Partial<MediaItem>) => {
    const res = await fetch(`/api/admin/media-feed/${id}`, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) setError(ru ? 'Не удалось сохранить' : 'Could not save');
  };

  const handleAdd = async () => {
    if (files.length === 0) return;
    setError('');
    try {
      for (const [i, file] of files.entries()) {
        const kind: MediaItem['kind'] = file.type.startsWith('image/') ? 'photo' : 'video';
        const label = files.length > 1 ? `${i + 1}/${files.length} · ` : '';
        setProgress(`${label}0%`);
        const { url: src } = await uploadWithProgress(
          kind === 'photo' ? '/api/upload?folder=gallery' : '/api/upload/video',
          file,
          token,
          (pct) => setProgress(`${label}${pct}%`),
        );
        // A cover only makes sense for a single video upload.
        let poster: string | null = null;
        if (kind === 'video' && posterFile && files.length === 1) {
          poster = (await uploadWithProgress('/api/upload?folder=video-posters', posterFile, token, () => {})).url;
        }
        const res = await fetch('/api/admin/media-feed', {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, src, poster, title: { ru: titleRu, en: titleEn } }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      setFiles([]);
      setPosterFile(null);
      setTitleRu('');
      setTitleEn('');
      setInputKey((k) => k + 1);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setProgress(null);
      load();
    }
  };

  const handleDelete = async (item: MediaItem) => {
    const question = item.kind === 'photo'
      ? (ru ? 'Удалить это фото из галереи?' : 'Remove this photo from the gallery?')
      : (ru ? 'Удалить это видео из ленты?' : 'Remove this video from the feed?');
    if (!window.confirm(question)) return;
    const res = await fetch(`/api/admin/media-feed/${item.id}`, { method: 'DELETE', headers: authHeaders });
    if (!res.ok) setError(ru ? 'Не удалось удалить' : 'Could not delete');
    load();
  };

  // Swap position with the neighbour inside the same list.
  const move = async (list: MediaItem[], index: number, delta: -1 | 1) => {
    const a = list[index];
    const b = list[index + delta];
    if (!a || !b) return;
    await Promise.all([save(a.id, { sortOrder: index + delta }), save(b.id, { sortOrder: index })]);
    load();
  };

  const toggle = async (item: MediaItem) => {
    await save(item.id, { isActive: !item.isActive });
    load();
  };

  const saveTitle = async (item: MediaItem, lang: Language, value: string) => {
    if (value === item.title[lang]) return;
    await save(item.id, { title: { ...item.title, [lang]: value } });
    load();
  };

  const inputClass = 'w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-nadeck-500 focus:outline-none bg-white';
  const singleVideo = files.length === 1 && !files[0].type.startsWith('image/');

  const renderList = (kind: MediaItem['kind']) => {
    const list = items.filter((item) => item.kind === kind);
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800">
          {kind === 'video' ? (ru ? 'Видео' : 'Videos') : (ru ? 'Фото' : 'Photos')} · {list.length}
        </h3>
        {list.length === 0 ? (
          <p className="text-sm text-slate-500">
            {kind === 'video'
              ? (ru ? 'Видео пока нет — блок на сайте скрыт.' : 'No videos yet - the block is hidden on the site.')
              : (ru ? 'Фото пока нет — блок на сайте скрыт.' : 'No photos yet - the block is hidden on the site.')}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {list.map((item, index) => (
              <div key={item.id} className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${item.isActive ? '' : 'opacity-50'}`}>
                {kind === 'video' ? (
                  <video src={`${item.src}#t=0.1`} poster={item.poster || undefined} className="w-full aspect-[9/16] object-cover bg-slate-900" muted playsInline preload="metadata" controls />
                ) : (
                  <img src={item.src} alt="" className="w-full aspect-square object-cover bg-slate-100" loading="lazy" />
                )}
                <div className="p-3 space-y-2">
                  {(['ru', 'en'] as Language[]).map((lang) => (
                    <input
                      key={lang}
                      defaultValue={item.title[lang]}
                      onBlur={(e) => saveTitle(item, lang, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                      aria-label={lang.toUpperCase()}
                      placeholder={lang.toUpperCase()}
                    />
                  ))}
                  <div className="flex items-center justify-between gap-1">
                    <button type="button" onClick={() => move(list, index, -1)} disabled={index === 0} aria-label={ru ? 'Выше' : 'Move up'} className="w-8 h-8 rounded-lg hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center"><ArrowUp className="w-4 h-4" /></button>
                    <button type="button" onClick={() => move(list, index, 1)} disabled={index === list.length - 1} aria-label={ru ? 'Ниже' : 'Move down'} className="w-8 h-8 rounded-lg hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center"><ArrowDown className="w-4 h-4" /></button>
                    <button type="button" onClick={() => toggle(item)} aria-label={item.isActive ? (ru ? 'Скрыть' : 'Hide') : (ru ? 'Показать' : 'Show')} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                      {item.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button type="button" onClick={() => handleDelete(item)} aria-label={ru ? 'Удалить' : 'Delete'} className="w-8 h-8 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8" id="view-admin-media-feed">
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{ru ? 'Добавить видео или фото' : 'Add videos or photos'}</h3>
          <p className="text-xs text-slate-500 mt-1">
            {ru
              ? 'Видео попадут в ленту, фото — в галерею под каталогом. Можно выбрать несколько файлов сразу.'
              : 'Videos go to the feed, photos to the gallery under the catalog. Several files at once are fine.'}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5 text-xs font-semibold text-slate-600">
            <span>{ru ? 'Файлы: видео MP4 до 95 МБ, фото JPG/PNG/WEBP до 5 МБ' : 'Files: MP4 video up to 95 MB, JPG/PNG/WEBP photo up to 5 MB'} *</span>
            <input
              key={`files-${inputKey}`}
              type="file"
              multiple
              accept="video/mp4,video/webm,video/quicktime,image/png,image/jpeg,image/webp"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className={inputClass}
            />
          </label>
          {singleVideo && (
            <label className="space-y-1.5 text-xs font-semibold text-slate-600">
              <span>{ru ? 'Обложка видео (необязательно)' : 'Video cover (optional)'}</span>
              <input key={`poster-${inputKey}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setPosterFile(e.target.files?.[0] || null)} className={inputClass} />
            </label>
          )}
          <label className="space-y-1.5 text-xs font-semibold text-slate-600">
            <span>{ru ? 'Подпись (RU)' : 'Caption (RU)'}</span>
            <input value={titleRu} onChange={(e) => setTitleRu(e.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-600">
            <span>{ru ? 'Подпись (EN)' : 'Caption (EN)'}</span>
            <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={inputClass} />
          </label>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleAdd}
            disabled={files.length === 0 || progress !== null}
            className="h-11 px-5 rounded-xl bg-nadeck-700 hover:bg-nadeck-800 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2"
          >
            {progress !== null ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {progress !== null ? `${ru ? 'Загрузка' : 'Uploading'} ${progress}` : ru ? 'Загрузить' : 'Upload'}
          </button>
          {error && <span className="text-xs font-semibold text-rose-600">{error}</span>}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <p className="text-sm text-slate-500">{ru ? 'Загрузка…' : 'Loading…'}</p>
      ) : (
        <>
          {renderList('video')}
          {renderList('photo')}
        </>
      )}
    </div>
  );
}
