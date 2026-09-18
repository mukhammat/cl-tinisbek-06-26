/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Language } from '../types';
import { AlertCircle, Check, ImageOff, Loader2, Lock, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Everything already in the R2 bucket, so an admin can reuse an image instead of re-uploading
// it - and drop the ones nothing uses any more. `inUse` comes from the backend, which checks
// every product gallery and category icon; those images can't be deleted (see upload.service.ts).
interface StoredImage {
  key: string;
  url: string;
  size: number;
  lastModified: string | null;
  inUse: boolean;
}

type LibraryFolder = 'categories' | 'medicines';

interface MediaLibraryModalProps {
  isOpen: boolean;
  currentLang: Language;
  authHeaders: Record<string, string>;
  // Folder shown first; the admin can still switch tabs to browse the other one.
  initialFolder: LibraryFolder;
  // Product photos accept several at once, a category icon only one.
  multiple?: boolean;
  onClose: () => void;
  onSelect: (urls: string[]) => void;
}

const FOLDERS: LibraryFolder[] = ['medicines', 'categories'];

export default function MediaLibraryModal({
  isOpen,
  currentLang,
  authHeaders,
  initialFolder,
  multiple = false,
  onClose,
  onSelect,
}: MediaLibraryModalProps) {
  const isRu = currentLang === 'ru';
  const [folder, setFolder] = useState<LibraryFolder>(initialFolder);
  const [images, setImages] = useState<StoredImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  // Deletion is permanent, so the trash button only arms the tile - the actual request waits
  // for a second, explicit click on that tile's "Удалить".
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Reopening resets to the folder the caller asked for and drops the previous selection.
  useEffect(() => {
    if (isOpen) {
      setFolder(initialFolder);
      setSelected([]);
      setPendingDeleteKey(null);
      setDeleteError('');
    }
  }, [isOpen, initialFolder]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoading(true);
    setErrorMsg('');

    fetch(`/api/upload/library?folder=${folder}`, { headers: authHeaders })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || 'Failed to load storage');
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setImages(data.images || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setImages([]);
        setErrorMsg(err.message || (isRu ? 'Не удалось загрузить хранилище' : 'Could not load storage'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // authHeaders is rebuilt on every AdminPanel render - keying on the token itself keeps this
    // from refetching in a loop.
  }, [isOpen, folder, authHeaders.Authorization, isRu]);

  // Switching folders while a tile is armed would leave the confirmation hanging over an
  // unrelated image once the new list renders.
  useEffect(() => {
    setPendingDeleteKey(null);
    setDeleteError('');
  }, [folder]);

  const deleteImage = (image: StoredImage) => {
    setDeletingKey(image.key);
    setDeleteError('');

    fetch('/api/upload/library', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ keys: [image.key] }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || 'Failed to delete image');
        return data;
      })
      .then((data) => {
        // The backend has the final say on what was in use: it sees both storefronts' products,
        // while this list was loaded a while ago and may be stale.
        if ((data?.deleted || []).length === 0) {
          setDeleteError(isRu ? 'Картинка используется товаром или категорией — сначала уберите её оттуда' : 'This image is used by a product or category - remove it there first');
          setImages((prev) => prev.map((img) => (img.key === image.key ? { ...img, inUse: true } : img)));
          return;
        }
        setImages((prev) => prev.filter((img) => img.key !== image.key));
        setSelected((prev) => prev.filter((url) => url !== image.url));
      })
      .catch((err) => {
        setDeleteError(err.message || (isRu ? 'Не удалось удалить картинку' : 'Could not delete the image'));
      })
      .finally(() => {
        setDeletingKey(null);
        setPendingDeleteKey(null);
      });
  };

  const toggle = (url: string) => {
    if (!multiple) {
      setSelected([url]);
      return;
    }
    setSelected((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]));
  };

  const confirm = () => {
    if (selected.length === 0) return;
    onSelect(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4" id="media-library-wrapper">
        <motion.div
          id="media-library-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        />

        <motion.div
          id="media-library-content"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10"
        >
          {/* Header */}
          <div className="px-5 sm:px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100 shrink-0">
            <div>
              <h2 className="text-lg font-black text-slate-900">{isRu ? 'Хранилище изображений' : 'Image storage'}</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isRu ? 'Выберите загруженное ранее изображение' : 'Pick a previously uploaded image'}
              </p>
            </div>
            <button
              type="button"
              id="btn-close-media-library"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Folder tabs */}
          <div className="px-5 sm:px-6 py-3 flex items-center gap-2 border-b border-slate-50 shrink-0">
            {FOLDERS.map((name) => (
              <button
                key={name}
                type="button"
                id={`media-library-tab-${name}`}
                onClick={() => setFolder(name)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                  folder === name
                    ? 'bg-nadeck-600 text-white'
                    : 'bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                {name === 'medicines' ? (isRu ? 'Фото товаров' : 'Product photos') : isRu ? 'Иконки категорий' : 'Category icons'}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4" id="media-library-grid">
            {loading ? (
              <div className="h-40 flex items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : errorMsg ? (
              <div className="h-40 flex flex-col items-center justify-center gap-2 text-rose-600">
                <AlertCircle className="w-6 h-6" />
                <p className="text-xs font-bold">{errorMsg}</p>
              </div>
            ) : images.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center gap-2 text-slate-400">
                <ImageOff className="w-6 h-6" />
                <p className="text-xs font-bold">{isRu ? 'В этой папке пока пусто' : 'Nothing in this folder yet'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {images.map((image) => {
                  const isSelected = selected.includes(image.url);
                  const isPending = pendingDeleteKey === image.key;
                  const isDeleting = deletingKey === image.key;
                  return (
                    // A wrapper, not a single button: the delete control has to sit on top of
                    // the picker without nesting one button inside another.
                    <div key={image.key} className="relative group aspect-square">
                      <button
                        type="button"
                        onClick={() => toggle(image.url)}
                        title={image.key}
                        className={`w-full h-full rounded-2xl overflow-hidden border-2 bg-slate-50 transition-colors ${
                          isSelected ? 'border-nadeck-600' : 'border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <img src={image.url} alt="" loading="lazy" className="w-full h-full object-contain p-1.5" />
                      </button>

                      {isSelected && (
                        <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-nadeck-600 text-white flex items-center justify-center pointer-events-none">
                          <Check className="w-3 h-3" />
                        </span>
                      )}

                      {/* An image a product or category still points at can't be deleted -
                          the lock explains why there's no trash button on this one. */}
                      {image.inUse ? (
                        <span
                          title={isRu ? 'Используется товаром или категорией' : 'Used by a product or category'}
                          className="absolute bottom-1 left-1 w-5 h-5 rounded-lg bg-white/90 text-slate-400 flex items-center justify-center shadow-sm"
                        >
                          <Lock className="w-3 h-3" />
                        </span>
                      ) : (
                        !isPending && (
                          <button
                            type="button"
                            onClick={() => { setPendingDeleteKey(image.key); setDeleteError(''); }}
                            title={isRu ? 'Удалить из хранилища' : 'Delete from storage'}
                            className="absolute bottom-1 left-1 w-6 h-6 rounded-lg bg-white/90 text-slate-400 hover:text-rose-600 hover:bg-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}

                      {isPending && (
                        <div className="absolute inset-0 rounded-2xl bg-slate-900/75 flex flex-col items-center justify-center gap-1.5 px-1 text-center">
                          {isDeleting ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          ) : (
                            <>
                              <p className="text-[10px] font-bold text-white leading-tight">
                                {isRu ? 'Удалить навсегда?' : 'Delete for good?'}
                              </p>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => deleteImage(image)}
                                  className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold transition-colors"
                                >
                                  {isRu ? 'Да' : 'Yes'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteKey(null)}
                                  className="px-2 py-1 rounded-lg bg-white/90 hover:bg-white text-slate-700 text-[10px] font-bold transition-colors"
                                >
                                  {isRu ? 'Нет' : 'No'}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
            {deleteError ? (
              <span className="text-[11px] text-rose-600 font-bold flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{deleteError}</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">
                {isRu ? `Выбрано: ${selected.length}` : `Selected: ${selected.length}`}
              </span>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                {isRu ? 'Отмена' : 'Cancel'}
              </button>
              <button
                type="button"
                id="btn-media-library-confirm"
                onClick={confirm}
                disabled={selected.length === 0}
                className="px-4 py-2.5 rounded-xl bg-nadeck-600 hover:bg-nadeck-700 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold transition-colors"
              >
                {isRu ? 'Выбрать' : 'Select'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
