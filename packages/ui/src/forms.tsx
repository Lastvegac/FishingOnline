import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { ApiError } from './http';
import { isFormControl, validationText, type FormControl } from './validation';
import { localizeMessage, useI18n } from './i18n';

const matchesField = (name: string, path: string) =>
  name === path || path.startsWith(`${name}.`);
const FormContext = createContext<{
  error?: Error | null;
  clear: (name: string) => void;
  cleared: Set<string>;
  element: React.RefObject<HTMLFormElement | null>;
} | null>(null);

export function Form({
  error,
  onSubmit,
  children,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement> & { error?: Error | null }) {
  const element = useRef<HTMLFormElement>(null);
  const [cleared, setCleared] = useState(new Set<string>());
  const clear = useCallback(
    (name: string) =>
      setCleared((previous) =>
        previous.has(name) ? previous : new Set([...previous, name]),
      ),
    [],
  );
  useEffect(() => {
    setCleared(new Set());
    if (!(error instanceof ApiError) || !error.fields) return;
    const first = Array.from(element.current?.elements ?? []).find(
      (control) =>
        isFormControl(control) &&
        Object.keys(error.fields!).some((path) =>
          matchesField(control.name, path),
        ),
    );
    if (first && isFormControl(first)) first.focus();
  }, [error]);
  return (
    <FormContext.Provider value={{ error, clear, cleared, element }}>
      <form
        {...props}
        ref={element}
        noValidate
        onSubmit={(event) => {
          if (!event.currentTarget.checkValidity()) {
            event.preventDefault();
            const first = Array.from(event.currentTarget.elements).find(
              (control) => isFormControl(control) && !control.validity.valid,
            );
            if (first && isFormControl(first)) first.focus();
            return;
          }
          onSubmit?.(event);
        }}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}

export function FormError({ error }: { error?: Error | null }) {
  useI18n();
  const form = useContext(FormContext);
  if (!error) return null;
  let message = error.message;
  if (
    error instanceof ApiError &&
    error.fields &&
    Object.keys(error.fields).length
  ) {
    const names = Array.from(form?.element.current?.elements ?? [])
      .filter(isFormControl)
      .map((control) => control.name);
    message = [
      ...(error.formErrors ?? []),
      ...Object.entries(error.fields)
        .filter(
          ([path]) => !names.some((name) => name && matchesField(name, path)),
        )
        .flatMap(([, values]) => values),
    ]
      .map(localizeMessage)
      .join(' ');
  }
  return message ? (
    <p className="fwo-form-error" role="alert">
      {localizeMessage(message)}
    </p>
  ) : null;
}

type FieldChild = {
  id?: string;
  name?: string;
  required?: boolean;
  'aria-invalid'?: React.AriaAttributes['aria-invalid'];
  'aria-describedby'?: string;
};
export function FormField({
  label,
  error,
  help,
  id,
  children,
  required = false,
  visuallyHiddenLabel = false,
}: {
  label: string;
  error?: string;
  help?: string;
  id?: string;
  children: React.ReactElement<FieldChild>;
  required?: boolean;
  visuallyHiddenLabel?: boolean;
}) {
  const generated = useId();
  const form = useContext(FormContext);
  const [nativeError, setNativeError] = useState('');
  const { locale } = useI18n();
  const control = useRef<FormControl | null>(null);
  const formElement = form?.element;
  useEffect(() => {
    const element = formElement?.current;
    if (!element) return;
    const reset = () => {
      control.current = null;
      setNativeError('');
    };
    element.addEventListener('reset', reset);
    return () => element.removeEventListener('reset', reset);
  }, [formElement]);
  useEffect(() => {
    if (control.current) setNativeError(validationText(control.current, label));
  }, [locale, label]);
  const fieldId = id ?? children.props.id ?? generated;
  const name = children.props.name ?? '';
  const serverError =
    form?.error instanceof ApiError && !form.cleared.has(name)
      ? Object.entries(form.error.fields ?? {}).find(
          ([path]) => name && matchesField(name, path),
        )?.[1][0]
      : undefined;
  const message = nativeError || localizeMessage(error || serverError || '');
  const mandatory = required || children.props.required;
  const update = (target: EventTarget | null, force: boolean) => {
    if (!isFormControl(target)) return;
    if (force || nativeError) {
      control.current = target;
      setNativeError(validationText(target, label));
    }
  };
  return (
    <div
      className="fwo-field"
      onInvalidCapture={(event) => {
        event.preventDefault();
        update(event.target, true);
        if (
          isFormControl(event.target) &&
          event.target.form?.querySelector(':invalid') === event.target
        )
          event.target.focus();
      }}
      onBlur={(event) => update(event.target, true)}
      onInput={(event) => {
        form?.clear(name);
        update(event.target, false);
      }}
    >
      <label
        htmlFor={fieldId}
        className={visuallyHiddenLabel ? 'fwo-sr-only' : undefined}
      >
        {label}
        {mandatory && (
          <span className="fwo-required-mark" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {React.cloneElement(children, {
        id: fieldId,
        required: mandatory,
        'aria-invalid': !!message,
        'aria-describedby': message || help ? `${fieldId}-hint` : undefined,
      })}
      {(message || help) && (
        <small
          id={`${fieldId}-hint`}
          className={message ? 'fwo-field-error' : ''}
          role={message ? 'alert' : undefined}
        >
          {message || help}
        </small>
      )}
    </div>
  );
}
