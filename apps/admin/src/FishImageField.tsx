import { useEffect, useRef, useState } from 'react';
import {
  fishImageKeySchema,
  fishPhotoMaxBytes,
  type FishPhotoUpload,
} from '@fwo/contracts';
import { Button, FileInput, FishArt, FormField, Input, useI18n } from '@fwo/ui';
import styles from './admin.module.css';

export async function encodeFishPhoto(file: File): Promise<FishPhotoUpload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({ data: String(reader.result).split(',')[1]! });
    reader.onerror = () =>
      reject(new Error('Please choose a valid fish photo.'));
    reader.readAsDataURL(file);
  });
}

/** Complete photograph picker, preview and optional URL input for both fish forms. */
export function FishImageField({
  value,
  onChange,
  file,
  onFile,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}) {
  const { t, locale } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [previewSrc, setPreviewSrc] = useState<string>();
  const valid = fishImageKeySchema.safeParse(value).success;
  useEffect(() => {
    input.current?.setCustomValidity(
      !file && value && !valid ? t('admin.fish.imageInvalid') : '',
    );
  }, [value, valid, file, locale, t]);
  useEffect(() => {
    if (!file) {
      setPreviewSrc(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (picker.current?.validity.customError)
      picker.current.setCustomValidity(t('admin.fish.uploadInvalid'));
  }, [locale, t]);
  return (
    <>
      <FormField
        label={t('admin.fish.image')}
        required={!value && !file}
        help={t('admin.fish.uploadHelp')}
        error={error ? t('admin.fish.uploadInvalid') : undefined}
      >
        <FileInput
          ref={picker}
          fileName={file?.name}
          name="photoUpload"
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.files?.[0];
            if (!next) return;
            const allowed = /\.(jpe?g|png|webp|avif)$/i.test(next.name);
            const invalid =
              !allowed || next.size === 0 || next.size > fishPhotoMaxBytes;
            event.target.setCustomValidity(
              invalid ? t('admin.fish.uploadInvalid') : '',
            );
            setError(invalid ? 'invalid' : '');
            onFile(invalid ? null : next);
          }}
        />
      </FormField>
      {file && (
        <div className={styles.rowActions}>
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => {
              onFile(null);
              setError('');
              if (picker.current) {
                picker.current.value = '';
                picker.current.setCustomValidity('');
              }
            }}
          >
            {t('admin.fish.discardPhoto')}
          </Button>
        </div>
      )}
      <details>
        <summary>{t('admin.fish.imageUrlOption')}</summary>
        <FormField
          label={t('admin.fish.imageLink')}
          help={file ? t('admin.fish.photoPending') : t('admin.fish.imageHelp')}
        >
          <Input
            ref={input}
            name="imageKey"
            value={value}
            maxLength={2048}
            disabled={disabled || !!file}
            placeholder={t('admin.fish.imagePlaceholder')}
            onChange={(event) => {
              const next = event.target.value;
              event.target.setCustomValidity(
                next && !fishImageKeySchema.safeParse(next).success
                  ? t('admin.fish.imageInvalid')
                  : '',
              );
              onChange(next);
            }}
          />
        </FormField>
      </details>
      <FishArt
        imageKey={valid ? value.trim() : ''}
        previewSrc={previewSrc}
        className={styles.fishPreview}
        live
      />
    </>
  );
}
