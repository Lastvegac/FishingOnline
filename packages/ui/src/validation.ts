import { getLocale, t } from './i18n';
export type FormControl =
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
export function isFormControl(
  target: EventTarget | null,
): target is FormControl {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}
export function validationText(control: FormControl, label: string): string {
  const validity = control.validity;
  if (validity.customError) return control.validationMessage;
  if (validity.valueMissing)
    return control instanceof HTMLSelectElement ||
      (control instanceof HTMLInputElement &&
        ['checkbox', 'radio'].includes(control.type))
      ? t('validation.choose', { label: label.toLocaleLowerCase(getLocale()) })
      : t('validation.required', {
          label: label.toLocaleLowerCase(getLocale()),
        });
  if (
    validity.typeMismatch &&
    control instanceof HTMLInputElement &&
    control.type === 'email'
  )
    return t('validation.email');
  if (!(control instanceof HTMLSelectElement)) {
    if (validity.tooShort)
      return t('validation.tooShort', { label, min: control.minLength });
    if (validity.tooLong)
      return t('validation.tooLong', { label, max: control.maxLength });
  }
  if (control instanceof HTMLInputElement) {
    if (validity.rangeUnderflow)
      return t('validation.min', { label, min: control.min });
    if (validity.rangeOverflow)
      return t('validation.max', { label, max: control.max });
  }
  return validity.valid ? '' : t('validation.invalid', { label });
}
