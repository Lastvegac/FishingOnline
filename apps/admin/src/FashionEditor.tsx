import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cosmeticSchema } from '@fwo/contracts';
import type { CosmeticDto, FashionCollectionDto } from '@fwo/contracts';
import {
  ApiError,
  Button,
  Checkbox,
  Form,
  FormError,
  FormField,
  IconButton,
  Input,
  Notice,
  Select,
  Textarea,
  deviceTimeZone,
  rarityLabel,
  useI18n,
} from '@fwo/ui';
import styles from './admin.module.css';

type RecordData = Record<string, unknown>;
type Tier = {
  id: string;
  targetFish: number;
  premium: boolean;
  cosmeticId: string;
};
const text = (data: FormData, name: string) =>
  String(data.get(name) ?? '').trim();
const localDate = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 19);
};
const storedDate = (value: string, original: unknown) =>
  value
    ? new Date(value).getTime() === new Date(localDate(original)).getTime()
      ? original
      : new Date(value).toISOString()
    : null;
const newCode = (prefix: string) =>
  `${prefix.slice(0, 54)}-${crypto.randomUUID().slice(0, 8)}`;

/** Complete schedule fields shared by items, events and passes. */
function ScheduleFields({
  editing,
  required,
  disabled,
}: {
  editing: RecordData;
  required: boolean;
  disabled: boolean;
}) {
  const { t } = useI18n();
  return (
    <fieldset className={styles.fashionFieldset}>
      <legend>{t('fashion.editor.schedule')}</legend>
      <p>
        {t(
          required
            ? 'fashion.editor.scheduleHelp'
            : 'fashion.editor.optionalScheduleHelp',
          { zone: deviceTimeZone() },
        )}
      </p>
      <div className={styles.fashionFormGrid}>
        {(['startsAt', 'endsAt'] as const).map((name) => (
          <FormField
            key={name}
            label={t(`fashion.editor.${name}`)}
            required={required}
          >
            <Input
              name={name}
              type="datetime-local"
              step="1"
              required={required}
              defaultValue={localDate(editing[name])}
              disabled={disabled}
            />
          </FormField>
        ))}
      </div>
    </fieldset>
  );
}

function MoneyField({
  name,
  label,
  value,
  positive = false,
  digits = 18,
  disabled,
}: {
  name: string;
  label: string;
  value: unknown;
  positive?: boolean;
  digits?: number;
  disabled: boolean;
}) {
  return (
    <FormField label={label} required>
      <Input
        name={name}
        inputMode="numeric"
        required
        pattern={
          positive
            ? `[1-9][0-9]{0,${digits - 1}}`
            : `(0|[1-9][0-9]{0,${digits - 1}})`
        }
        maxLength={digits}
        defaultValue={String(value ?? '')}
        disabled={disabled}
      />
    </FormField>
  );
}

export function FashionEditor({
  id,
  tab,
  editing,
  cosmetics,
  collections,
  pending,
  error,
  onSubmit,
  onChange,
}: {
  id: string;
  tab: string;
  editing: RecordData;
  cosmetics: CosmeticDto[];
  collections: FashionCollectionDto[];
  pending: boolean;
  error: Error | null;
  onSubmit(data: RecordData, reason: string): void;
  onChange(): void;
}) {
  const { t, locale } = useI18n();
  const [localError, setLocalError] = useState<Error | null>(null);
  const [recordCode] = useState(() =>
    String(editing.id || newCode(tab === 'items' ? 'item' : 'collection')),
  );
  const [unlock, setUnlock] = useState(String(editing.unlockType ?? 'GOLD'));
  const makeTier = (): Tier => ({
    id: newCode('tier'),
    targetFish: 1,
    premium: false,
    cosmeticId: cosmetics[0]?.id ?? '',
  });
  const [tiers, setTiers] = useState<Tier[]>(() => {
    const existing = editing.tiers as Tier[] | undefined;
    return existing?.length ? existing : [makeTier()];
  });
  const itemName = (item: CosmeticDto) => {
    const key = `fashion.item.${item.assetId}` as Parameters<typeof t>[0];
    const fallback = t(key);
    return (
      (locale === 'en'
        ? item.nameEn || item.nameVi
        : item.nameVi || item.nameEn) || (fallback === key ? item.id : fallback)
    );
  };
  const assets = [
    ...new Map(
      cosmetics.map((item) => [`${item.slot}:${item.assetId}`, item]),
    ).entries(),
  ];
  const options = cosmetics.map((item) => (
    <option key={item.id} value={item.id}>
      {itemName(item)}
    </option>
  ));
  const invalid = (name: string, message: string) => {
    setLocalError(
      new ApiError('INVALID_FORM', message, 422, undefined, {
        [name]: [message],
      }),
    );
  };
  return (
    <Form
      id={id}
      error={localError ?? error}
      onChange={() => {
        setLocalError(null);
        onChange();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const reason = text(form, 'reason');
        const startsAt = storedDate(text(form, 'startsAt'), editing.startsAt);
        const endsAt = storedDate(text(form, 'endsAt'), editing.endsAt);
        if (
          startsAt &&
          endsAt &&
          Date.parse(String(startsAt)) >= Date.parse(String(endsAt))
        ) {
          invalid('endsAt', t('fashion.editor.invalidDates'));
          return;
        }
        const common = {
          active: form.get('active') === 'on',
          expectedVersion: Number(editing.expectedVersion ?? 0),
        };
        let data: RecordData;
        if (tab === 'items') {
          const asset = assets.find(
            ([key]) => key === text(form, 'assetId'),
          )?.[1];
          if (!asset) {
            invalid('assetId', t('fashion.editor.selectAsset'));
            return;
          }
          data = {
            ...common,
            id: recordCode,
            assetId: asset.assetId,
            slot: asset.slot,
            nameVi: text(form, 'nameVi'),
            nameEn: text(form, 'nameEn'),
            descriptionVi: text(form, 'descriptionVi'),
            descriptionEn: text(form, 'descriptionEn'),
            rarity: text(form, 'rarity'),
            unlockType: unlock,
            priceGold: unlock === 'GOLD' ? text(form, 'priceGold') : '0',
            priceDiamonds:
              unlock === 'DIAMOND' ? text(form, 'priceDiamonds') : '0',
            minLevel: Number(text(form, 'minLevel')),
            collectionId: text(form, 'collectionId') || null,
            startsAt,
            endsAt,
          };
        } else if (tab === 'collections') {
          const itemIds = form.getAll('itemIds').map(String);
          if (itemIds.length > 20) {
            invalid('itemIds', t('fashion.editor.collectionLimit'));
            return;
          }
          data = {
            id: recordCode,
            name: text(form, 'name'),
            description: text(form, 'description'),
            itemIds,
            discountPercent: Number(text(form, 'discountPercent')),
            active: common.active,
            version: Number(editing.version ?? 1),
          };
        } else if (tab === 'events') {
          data = {
            ...common,
            ...(editing.id ? { id: editing.id } : {}),
            name: text(form, 'name'),
            theme: text(form, 'theme'),
            startsAt,
            endsAt,
            rewardGold: text(form, 'rewardGold'),
            rewardCosmeticId: text(form, 'rewardCosmeticId') || null,
          };
        } else {
          data = {
            ...common,
            ...(editing.id ? { id: editing.id } : {}),
            name: text(form, 'name'),
            kind: text(form, 'kind'),
            startsAt,
            endsAt,
            priceDiamonds: text(form, 'priceDiamonds'),
            tiers: tiers.map((tier, index) => ({
              id: tier.id,
              targetFish: Number(text(form, `tiers.${index}.targetFish`)),
              premium: form.get(`tiers.${index}.premium`) === 'on',
              cosmeticId: text(form, `tiers.${index}.cosmeticId`),
            })),
          };
        }
        setLocalError(null);
        onSubmit(data, reason);
      }}
    >
      <fieldset className={styles.fashionFieldset} disabled={pending}>
        <legend>{t('fashion.editor.information')}</legend>
        {tab === 'items' ? (
          <>
            <FormField
              label={t('fashion.editor.asset')}
              required
              help={t('fashion.editor.assetHelp')}
            >
              <Select
                name="assetId"
                required
                defaultValue={`${editing.slot}:${editing.assetId}`}
              >
                <option value="">{t('fashion.editor.selectAsset')}</option>
                {assets.map(([key, item]) => (
                  <option key={key} value={key}>
                    {t('fashion.editor.assetOption', {
                      name: itemName(item),
                      slot: t(`character.slot.${item.slot}`),
                    })}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className={styles.fashionFormGrid}>
              {(['nameVi', 'nameEn'] as const).map((name) => (
                <FormField
                  key={name}
                  label={t(`fashion.editor.${name}`)}
                  help={t('fashion.editor.nameHelp')}
                >
                  <Input
                    name={name}
                    maxLength={120}
                    defaultValue={String(editing[name] ?? '')}
                  />
                </FormField>
              ))}
            </div>
            {(['descriptionVi', 'descriptionEn'] as const).map((name) => (
              <FormField key={name} label={t(`fashion.editor.${name}`)}>
                <Textarea
                  name={name}
                  rows={3}
                  maxLength={1000}
                  defaultValue={String(editing[name] ?? '')}
                />
              </FormField>
            ))}
            <FormField label={t('fashion.editor.rarity')} required>
              <Select name="rarity" defaultValue={String(editing.rarity)}>
                {cosmeticSchema.shape.rarity.options.map((value) => (
                  <option key={value} value={value}>
                    {rarityLabel(value)}
                  </option>
                ))}
              </Select>
            </FormField>
          </>
        ) : (
          <>
            <FormField label={t('fashion.editor.name')} required>
              <Input
                name="name"
                required
                minLength={2}
                maxLength={120}
                defaultValue={String(editing.name ?? '')}
              />
            </FormField>
            {tab === 'collections' && (
              <FormField label={t('fashion.editor.description')}>
                <Textarea
                  name="description"
                  rows={3}
                  maxLength={1000}
                  defaultValue={String(editing.description ?? '')}
                />
              </FormField>
            )}
            {tab === 'events' && (
              <FormField label={t('fashion.editor.theme')} required>
                <Textarea
                  name="theme"
                  required
                  minLength={2}
                  maxLength={1000}
                  rows={3}
                  defaultValue={String(editing.theme ?? '')}
                />
              </FormField>
            )}
          </>
        )}
      </fieldset>
      {tab === 'items' && (
        <fieldset className={styles.fashionFieldset} disabled={pending}>
          <legend>{t('fashion.editor.access')}</legend>
          <FormField label={t('fashion.editor.unlock')} required>
            <Select
              name="unlockType"
              value={unlock}
              onChange={(event) => setUnlock(event.target.value)}
            >
              {cosmeticSchema.shape.unlockType.options.map((value) => (
                <option key={value} value={value}>
                  {t(`fashion.currency.${value}`)}
                </option>
              ))}
            </Select>
          </FormField>
          {unlock === 'GOLD' && (
            <MoneyField
              name="priceGold"
              label={t('fashion.editor.priceGold')}
              value={editing.priceGold}
              positive
              disabled={pending}
            />
          )}
          {unlock === 'DIAMOND' && (
            <MoneyField
              name="priceDiamonds"
              label={t('fashion.editor.priceDiamonds')}
              value={editing.priceDiamonds}
              positive
              disabled={pending}
            />
          )}
          <FormField
            label={t('fashion.editor.minLevel')}
            required
            help={t('fashion.editor.minLevelHelp')}
          >
            <Input
              name="minLevel"
              type="number"
              required
              min={1}
              step={1}
              defaultValue={Number(editing.minLevel ?? 1)}
            />
          </FormField>
          <FormField label={t('fashion.editor.collection')}>
            <Select
              name="collectionId"
              defaultValue={String(editing.collectionId ?? '')}
            >
              <option value="">{t('fashion.editor.noCollection')}</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </Select>
          </FormField>
        </fieldset>
      )}
      {tab === 'collections' && (
        <fieldset className={styles.fashionFieldset} disabled={pending}>
          <legend>{t('fashion.editor.collectionItems')}</legend>
          <FormField
            label={t('fashion.editor.collectionItems')}
            required
            help={t('fashion.editor.collectionHelp')}
          >
            <Select
              name="itemIds"
              multiple
              required
              size={Math.min(8, Math.max(3, cosmetics.length))}
              defaultValue={(editing.itemIds as string[]) ?? []}
            >
              {options}
            </Select>
          </FormField>
          <FormField label={t('fashion.editor.discount')} required>
            <Input
              name="discountPercent"
              type="number"
              required
              min={0}
              max={50}
              step={1}
              defaultValue={Number(editing.discountPercent ?? 0)}
            />
          </FormField>
        </fieldset>
      )}
      {tab === 'events' && (
        <fieldset className={styles.fashionFieldset} disabled={pending}>
          <legend>{t('fashion.editor.rewards')}</legend>
          <MoneyField
            name="rewardGold"
            label={t('fashion.editor.rewardGold')}
            value={editing.rewardGold}
            digits={7}
            disabled={pending}
          />
          <FormField label={t('fashion.editor.rewardItem')}>
            <Select
              name="rewardCosmeticId"
              defaultValue={String(editing.rewardCosmeticId ?? '')}
            >
              <option value="">{t('fashion.editor.noRewardItem')}</option>
              {options}
            </Select>
          </FormField>
        </fieldset>
      )}
      {tab === 'passes' && (
        <fieldset className={styles.fashionFieldset} disabled={pending}>
          <legend>{t('fashion.editor.pass')}</legend>
          <FormField label={t('fashion.editor.passKind')} required>
            <Select name="kind" defaultValue={String(editing.kind ?? 'SEASON')}>
              <option value="SEASON">{t('fashion.editor.season')}</option>
              <option value="MEMBERSHIP">
                {t('fashion.editor.membership')}
              </option>
            </Select>
          </FormField>
          <MoneyField
            name="priceDiamonds"
            label={t('fashion.editor.priceDiamonds')}
            value={editing.priceDiamonds}
            digits={7}
            disabled={pending}
          />
          <h3>{t('fashion.editor.rewards')}</h3>
          {tiers.map((tier, index) => (
            <div key={tier.id} className={styles.fashionTier}>
              <div className={styles.fashionCardHeader}>
                <h4>{t('fashion.editor.tier', { number: index + 1 })}</h4>
                <IconButton
                  label={t('fashion.editor.removeTier', { number: index + 1 })}
                  disabled={pending || tiers.length === 1}
                  onClick={() => {
                    setTiers(tiers.filter((row) => row.id !== tier.id));
                    onChange();
                  }}
                >
                  <Trash2 size={17} aria-hidden />
                </IconButton>
              </div>
              <FormField label={t('fashion.editor.targetFish')} required>
                <Input
                  name={`tiers.${index}.targetFish`}
                  type="number"
                  required
                  min={0}
                  max={100000}
                  step={1}
                  defaultValue={tier.targetFish}
                />
              </FormField>
              <FormField label={t('fashion.editor.rewardItem')} required>
                <Select
                  name={`tiers.${index}.cosmeticId`}
                  required
                  defaultValue={tier.cosmeticId}
                >
                  <option value="">
                    {t('fashion.editor.selectRewardItem')}
                  </option>
                  {options}
                </Select>
              </FormField>
              <Checkbox
                name={`tiers.${index}.premium`}
                label={t('fashion.editor.premium')}
                defaultChecked={tier.premium}
              />
            </div>
          ))}
          <Button
            variant="secondary"
            disabled={pending || tiers.length >= 30}
            onClick={() => {
              setTiers([...tiers, makeTier()]);
              onChange();
            }}
          >
            <Plus size={16} aria-hidden />
            {t('fashion.editor.addTier')}
          </Button>
        </fieldset>
      )}
      {tab !== 'collections' && (
        <ScheduleFields
          editing={editing}
          required={tab !== 'items'}
          disabled={pending}
        />
      )}
      <fieldset className={styles.fashionFieldset} disabled={pending}>
        <legend>{t('fashion.editor.publication')}</legend>
        <Checkbox
          name="active"
          label={t('fashion.editor.active')}
          defaultChecked={!!editing.active}
        />
        <Notice>{t('fashion.editor.activeHelp')}</Notice>
        <FormField
          label={t('fashion.adminReason')}
          required
          help={t('fashion.editor.reasonHelp')}
        >
          <Textarea
            name="reason"
            required
            minLength={5}
            maxLength={1000}
            rows={2}
          />
        </FormField>
      </fieldset>
      <FormError error={localError ?? error} />
    </Form>
  );
}
