import { useEffect, useRef, useState, useId, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Shuffle,
  RotateCcw,
  Save,
  Check,
  Heart,
  Copy,
  Share2,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Card,
  Form,
  FormField,
  FormError,
  Input,
  RangeField,
  Select,
  Checkbox,
  Tabs,
  BottomActions,
  PageHeader,
  Badge,
  RarityBadge,
  CurrencyAmount,
  Notice,
  LoadingState,
  ErrorState,
  EmptyState,
  Modal,
  useI18n,
  useToast,
  localeTag,
  CharacterThumbnail,
} from '@fwo/ui';
import { CharacterPreview } from '@fwo/ui/character-preview';
import type { MessageKey } from '@fwo/ui';
import {
  characterSlots,
  characterAnimations,
  characterColors,
  fashionPatterns,
} from '@fwo/contracts';
import type {
  CharacterSaveInput,
  CharacterDto,
  CharacterCatalogDto,
  CharacterAppearance,
  CharacterEquipment,
  CharacterAnimation,
  CosmeticDto,
  OutfitDto,
} from '@fwo/contracts';
import { api, useAuth, usePreferences, queryClient } from './data';
import {
  useCharacter,
  useCharacterCatalog,
  useOutfits,
  useFashionCollections,
  useFashionEvents,
  useFashionWallet,
  invalidateFashion,
} from './character-data';
import { FashionPasses } from './FashionPasses';
import styles from './character.module.css';

export function CharacterChoice({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <FormField label={label}>
      <Select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </FormField>
  );
}
export default function CharacterPage() {
  const c = useCharacter(),
    catalog = useCharacterCatalog();
  if (c.isPending || catalog.isPending) return <LoadingState />;
  if (c.error || catalog.error)
    return (
      <ErrorState
        error={c.error ?? catalog.error}
        retry={() => {
          void c.refetch();
          void catalog.refetch();
        }}
      />
    );
  return <Studio initial={c.data ?? null} catalog={catalog.data!} />;
}
function Studio({
  initial,
  catalog,
}: {
  initial: CharacterDto | null;
  catalog: CharacterCatalogDto;
}) {
  const { t, locale } = useI18n(),
    toast = useToast(),
    navigate = useNavigate(),
    [params, setParams] = useSearchParams();
  const player = useAuth((s) => s.player)!,
    prefs = usePreferences();
  const first =
    catalog.presets.find((p) => p.id === 'elder') ?? catalog.presets[0];
  const fresh = (): CharacterSaveInput => ({
    name: initial?.name ?? player.username,
    presetId: initial?.presetId ?? first.id,
    appearance: structuredClone(initial?.appearance ?? first.appearance),
    equipment: structuredClone(initial?.equipment ?? first.equipment),
    expectedVersion: initial?.version ?? 0,
  });
  const [draft, setDraft] = useState(fresh),
    [night, setNight] = useState(false),
    [animation, setAnimation] = useState<CharacterAnimation>('IDLE');
  const requestedTab = params.get('tab') ?? 'appearance';
  const tab = [
    'appearance',
    'market',
    'wardrobe',
    'community',
    'events',
  ].includes(requestedTab)
    ? requestedTab
    : 'appearance';
  const setTab = (value: string) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set('tab', value);
        return next;
      },
      { replace: true },
    );
  };
  const [slot, setSlot] = useState<string>('UPPER'),
    [sort, setSort] = useState('PRICE_ASC'),
    [rarity, setRarity] = useState('ALL'),
    [ownedOnly, setOwnedOnly] = useState(false),
    [unownedOnly, setUnownedOnly] = useState(false),
    [currency, setCurrency] = useState('ALL');
  const [buying, setBuying] = useState<CosmeticDto | null>(null),
    purchaseKey = useRef(''),
    saveKey = useRef(crypto.randomUUID());
  const [outfitModal, setOutfitModal] = useState(false),
    [editing, setEditing] = useState<OutfitDto | null>(null),
    [outfitName, setOutfitName] = useState(''),
    [isPublic, setIsPublic] = useState(false),
    outfitForm = useId(),
    [deleteOutfit, setDeleteOutfit] = useState<OutfitDto | null>(null);
  const [following, setFollowing] = useState(false),
    [entryOutfit, setEntryOutfit] = useState('');
  const outfits = useOutfits(),
    community = useOutfits(following ? 'following' : 'all'),
    events = useFashionEvents(),
    collections = useFashionCollections(),
    wallet = useFashionWallet();
  const sharedId = params.get('outfit');
  const shared = useQuery({
    queryKey: ['shared-outfit', sharedId],
    queryFn: () => api.request<OutfitDto>(`/fashion/outfits/${sharedId}`),
    enabled: !!sharedId,
  });
  const imported = useRef('');
  const update = (patch: Partial<CharacterSaveInput>) => {
    saveKey.current = crypto.randomUUID();
    setDraft((d) => ({ ...d, ...patch }));
  };
  const appearance = (patch: Partial<CharacterAppearance>) =>
    update({ appearance: { ...draft.appearance, ...patch } });
  const label = (key: string) => t(`character.option.${key}` as MessageKey);
  const itemName = (item: CosmeticDto) =>
    (locale === 'en'
      ? item.nameEn || item.nameVi
      : item.nameVi || item.nameEn) ||
    t(`fashion.item.${item.assetId}` as MessageKey);
  const visualEquipment = (equipment: CharacterEquipment) =>
    Object.fromEntries(
      characterSlots.map((s) => [
        s,
        catalog.cosmetics.find((c) => c.id === equipment[s])?.assetId ??
          equipment[s],
      ]),
    ) as CharacterEquipment;
  const slotName = (s: string) => t(`character.slot.${s}` as MessageKey);
  const options = (values: readonly string[]) =>
    values.map((value) => ({ value, label: label(value) }));
  const save = useMutation({
    mutationFn: () =>
      api.request<CharacterDto>('/characters/me', {
        method: 'PUT',
        body: draft,
        idempotencyKey: saveKey.current,
      }),
    onSuccess: async (character) => {
      await queryClient.cancelQueries({ queryKey: ['character'] });
      queryClient.setQueryData(['character'], character);
      toast(t('character.saved'));
      navigate('/play');
      void invalidateFashion().catch((e: Error) => toast(e.message, 'danger'));
    },
  });
  const purchase = useMutation({
    mutationFn: () =>
      api.request('/shop/cosmetics/orders', {
        method: 'POST',
        idempotencyKey: purchaseKey.current,
        body: {
          cosmeticId: buying!.id,
          currency: buying!.unlockType === 'DIAMOND' ? 'DIAMOND' : 'GOLD',
          expectedPrice:
            buying!.unlockType === 'DIAMOND'
              ? buying!.priceDiamonds
              : buying!.priceGold,
          expectedVersion: buying!.version,
        },
      }),
    onSuccess: async () => {
      await invalidateFashion();
      setBuying(null);
      toast(t('fashion.purchased'));
    },
  });
  const action = useMutation({
    mutationFn: ({
      path,
      body,
      method = 'POST',
    }: {
      path: string;
      body: unknown;
      method?: 'POST' | 'PUT' | 'DELETE';
    }) => api.request(path, { method, body }),
    onSuccess: () => invalidateFashion(),
    onError: (e) => toast(e.message, 'danger'),
  });
  const outfitSave = useMutation({
    mutationFn: () =>
      api.request(`/fashion/outfits${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        body: {
          name: outfitName,
          appearance: draft.appearance,
          equipment: draft.equipment,
          isPublic,
          expectedVersion: editing?.version ?? 0,
        },
      }),
    onSuccess: async () => {
      await invalidateFashion();
      setOutfitModal(false);
      toast(t('fashion.outfitSaved'));
    },
  });
  const equip = useMutation({
    mutationFn: (o: OutfitDto) =>
      api.request<CharacterDto>(`/fashion/outfits/${o.id}/equip`, {
        method: 'POST',
        body: { expectedCharacterVersion: initial?.version ?? 0 },
      }),
    onSuccess: async (character) => {
      await queryClient.cancelQueries({ queryKey: ['character'] });
      queryClient.setQueryData(['character'], character);
      update({
        name: character.name,
        presetId: character.presetId,
        appearance: character.appearance,
        equipment: character.equipment,
        expectedVersion: character.version,
      });
      await invalidateFashion();
      toast(t('character.saved'));
    },
    onError: (e) => toast(e.message, 'danger'),
  });
  const tryOutfit = (o: OutfitDto) => {
    update({
      appearance: structuredClone(o.appearance),
      equipment: structuredClone(o.equipment),
    });
    setTab('market');
  };
  useEffect(() => {
    if (shared.data && imported.current !== shared.data.id) {
      imported.current = shared.data.id;
      tryOutfit(shared.data);
    }
  }, [shared.data]);
  const applyPreset = (id: string) => {
    const p = catalog.presets.find((p) => p.id === id)!;
    update({
      presetId: id,
      appearance: structuredClone(p.appearance),
      equipment: structuredClone(p.equipment),
    });
    setAnimation(p.animation);
  };
  const openSave = (o: OutfitDto | null, duplicate = false) => {
    if (o) {
      update({
        appearance: structuredClone(o.appearance),
        equipment: structuredClone(o.equipment),
      });
    }
    setEditing(duplicate ? null : o);
    setOutfitName(o?.name ?? draft.name);
    setIsPublic(duplicate ? false : (o?.isPublic ?? false));
    outfitSave.reset();
    setOutfitModal(true);
  };
  const share = async (o: OutfitDto) => {
    const url = `${window.location.origin}/play/character?outfit=${o.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(t('fashion.linkCopied'));
    } catch {
      toast(t('fashion.shareLink', { url }));
    }
  };
  const unavailable = [
    ...new Set([
      ...Object.values(draft.equipment),
      ...[
        draft.appearance.clothColor,
        draft.appearance.hairColor,
        draft.appearance.trimColor,
        ...Object.values(draft.appearance.dyes),
      ].map((color) => `dye-${color.toLowerCase()}`),
      `pattern-${draft.appearance.pattern.toLowerCase()}`,
    ]),
  ]
    .filter((id): id is string => !!id)
    .filter((id) => {
      const c = catalog.cosmetics.find((c) => c.id === id);
      return c && !c.owned;
    });
  const cost = unavailable.reduce((n, id) => {
    const c = catalog.cosmetics.find((c) => c.id === id);
    return n + (c?.unlockType === 'GOLD' ? BigInt(c.priceGold) : 0n);
  }, 0n);
  const diamondCost = unavailable.reduce((n, id) => {
    const c = catalog.cosmetics.find((c) => c.id === id);
    return n + (c?.unlockType === 'DIAMOND' ? BigInt(c.priceDiamonds) : 0n);
  }, 0n);
  const filtered = catalog.cosmetics
    .filter(
      (c) =>
        c.slot === slot &&
        (ownedOnly ? c.owned : true) &&
        (unownedOnly ? !c.owned : true) &&
        (rarity === 'ALL' || rarity === c.rarity) &&
        (currency === 'ALL' || currency === c.unlockType),
    )
    .sort((a, b) =>
      sort === 'POPULAR'
        ? b.purchaseCount - a.purchaseCount
        : sort === 'NEWEST'
          ? Date.parse(b.createdAt ?? '1970-01-01') -
            Date.parse(a.createdAt ?? '1970-01-01')
          : sort === 'RARITY'
            ? [
                'COMMON',
                'UNCOMMON',
                'RARE',
                'EPIC',
                'LEGENDARY',
                'MYTHICAL',
              ].indexOf(b.rarity) -
              [
                'COMMON',
                'UNCOMMON',
                'RARE',
                'EPIC',
                'LEGENDARY',
                'MYTHICAL',
              ].indexOf(a.rarity)
            : Number(BigInt(a.priceGold) - BigInt(b.priceGold)) *
              (sort === 'PRICE_DESC' ? -1 : 1),
    );
  const previewEquipment = useMemo(
    () => visualEquipment(draft.equipment),
    [draft.equipment, catalog.cosmetics],
  );
  const chooseItem = (c: CosmeticDto) => {
    if (c.slot === 'DYE')
      appearance({
        clothColor: c.id
          .slice(4)
          .toUpperCase() as CharacterAppearance['clothColor'],
      });
    else if (c.slot === 'PATTERN')
      appearance({
        pattern: c.id.slice(8).toUpperCase() as CharacterAppearance['pattern'],
      });
    else update({ equipment: { ...draft.equipment, [c.slot]: c.id } });
  };
  const selectedItem = (c: CosmeticDto) =>
    c.slot === 'DYE'
      ? draft.appearance.clothColor.toLowerCase() === c.id.slice(4)
      : c.slot === 'PATTERN'
        ? draft.appearance.pattern.toLowerCase() === c.id.slice(8)
        : draft.equipment[c.slot] === c.id;
  const fields = (
    values: readonly string[],
    name: string,
    value: string,
    onChange: (s: string) => void,
  ) => (
    <CharacterChoice
      name={name}
      label={t(`character.field.${name}` as MessageKey)}
      value={value}
      options={options(values)}
      onChange={onChange}
    />
  );
  return (
    <>
      <PageHeader
        eyebrow={t('character.eyebrow')}
        title={initial ? t('character.studio') : t('character.create')}
        description={t('character.description')}
        action={<Badge>{t('fashion.cosmeticOnly')}</Badge>}
      />
      {!initial && <Notice>{t('character.firstVisit')}</Notice>}
      {shared.error && (
        <ErrorState error={shared.error} retry={() => void shared.refetch()} />
      )}
      <div className={styles.layout}>
        <div className={styles.previewColumn}>
          <CharacterPreview
            appearance={draft.appearance}
            equipment={previewEquipment}
            presetId={draft.presetId}
            animation={animation}
            night={night}
            reducedMotion={prefs.reducedMotion}
          />
          <div className={styles.previewSettings}>
            <CharacterChoice
              name="animation"
              label={t('character.animation')}
              value={animation}
              options={characterAnimations.map((value) => ({
                value,
                label: t(`character.animation.${value}` as MessageKey),
              }))}
              onChange={(s) => setAnimation(s as CharacterAnimation)}
            />
            <Checkbox
              checked={night}
              onChange={(e) => setNight(e.target.checked)}
              label={t('character.night')}
            />
          </div>
          <p className={styles.hint}>{t('character.orbitHint')}</p>
          <div className={styles.row}>
            <CurrencyAmount value={player.gold} />
            <Badge>
              {t('fashion.diamonds', { count: wallet.data?.diamonds ?? '…' })}
            </Badge>
            <Link to="/play/payments">{t('fashion.topup')}</Link>
          </div>
          {unavailable.length > 0 && (
            <Notice tone="warning">
              {t('fashion.previewOnly', {
                count: unavailable.length,
                gold: cost.toString(),
                diamonds: diamondCost.toString(),
              })}
            </Notice>
          )}
        </div>
        <div className={styles.editor}>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              'appearance',
              'market',
              'wardrobe',
              'community',
              'events',
            ].map((value) => ({
              value,
              label: t(`fashion.tab.${value}` as MessageKey),
            }))}
          />
          {tab === 'appearance' && (
            <Form
              id="character-form"
              error={save.error}
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <FormField label={t('character.name')} required>
                <Input
                  name="name"
                  minLength={2}
                  maxLength={24}
                  required
                  pattern={'[\\p{L}\\p{N}_ .\\-]+'}
                  value={draft.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </FormField>
              <div className={styles.presets}>
                {catalog.presets.map((p) => (
                  <Button
                    key={p.id}
                    variant={draft.presetId === p.id ? 'primary' : 'secondary'}
                    aria-pressed={draft.presetId === p.id}
                    onClick={() => applyPreset(p.id)}
                  >
                    <span className={styles.presetPortrait}>
                      <CharacterThumbnail
                        appearance={p.appearance}
                        equipment={visualEquipment(p.equipment)}
                        presetId={p.id}
                      />
                    </span>
                    <span>
                      {t(`character.preset.${p.id}` as MessageKey)}
                      <small>
                        {t(
                          `character.preset.${p.id}.description` as MessageKey,
                        )}
                      </small>
                    </span>
                  </Button>
                ))}
              </div>
              <div className={styles.grid}>
                {fields(
                  ['MALE', 'FEMALE'],
                  'gender',
                  draft.appearance.gender,
                  (s) =>
                    appearance({ gender: s as CharacterAppearance['gender'] }),
                )}
                {fields(
                  ['YOUNG', 'MIDDLE', 'ELDER'],
                  'ageGroup',
                  draft.appearance.ageGroup,
                  (s) =>
                    appearance({
                      ageGroup: s as CharacterAppearance['ageGroup'],
                      hairColor:
                        s === 'ELDER' ? 'SILVER' : draft.appearance.hairColor,
                    }),
                )}
                {(['shape', 'eyes', 'eyebrows', 'nose', 'mouth'] as const).map(
                  (key) => (
                    <CharacterChoice
                      key={key}
                      name={`face.${key}`}
                      label={t(`character.field.${key}` as MessageKey)}
                      value={draft.appearance.face[key]}
                      options={options([
                        'SOFT',
                        'ANGULAR',
                        'WEATHERED',
                        'SCHOLAR',
                      ])}
                      onChange={(s) =>
                        appearance({
                          face: { ...draft.appearance.face, [key]: s },
                        })
                      }
                    />
                  ),
                )}
                {(['skin', 'beard', 'mark'] as const).map((key) => (
                  <CharacterChoice
                    key={key}
                    name={`face.${key}`}
                    label={t(`character.field.${key}` as MessageKey)}
                    value={draft.appearance.face[key]}
                    options={options(
                      key === 'skin'
                        ? ['LIGHT', 'WARM', 'TAN', 'DEEP']
                        : key === 'beard'
                          ? ['NONE', 'SHORT', 'LONG']
                          : ['NONE', 'MOLE', 'SCAR'],
                    )}
                    onChange={(s) =>
                      appearance({
                        face: { ...draft.appearance.face, [key]: s },
                      })
                    }
                  />
                ))}
                <RangeField
                  label={t('character.wrinkles')}
                  name="face.wrinkles"
                  min={0}
                  max={1}
                  step={0.05}
                  value={draft.appearance.face.wrinkles}
                  onValueChange={(value) =>
                    appearance({
                      face: { ...draft.appearance.face, wrinkles: value },
                    })
                  }
                />
                {(['height', 'build'] as const).map((key) => (
                  <RangeField
                    key={key}
                    label={t(`character.field.${key}` as MessageKey)}
                    name={`body.${key}`}
                    min={key === 'height' ? 0.9 : 0.85}
                    max={key === 'height' ? 1.1 : 1.15}
                    step={0.01}
                    value={draft.appearance.body[key]}
                    onValueChange={(value) =>
                      appearance({
                        body: { ...draft.appearance.body, [key]: value },
                      })
                    }
                  />
                ))}
                {fields(
                  ['RELAXED', 'UPRIGHT'],
                  'posture',
                  draft.appearance.body.posture,
                  (s) =>
                    appearance({
                      body: {
                        ...draft.appearance.body,
                        posture: s as 'RELAXED' | 'UPRIGHT',
                      },
                    }),
                )}
                {fields(
                  ['SEATED', 'STANDING'],
                  'fishingStyle',
                  draft.appearance.fishingStyle,
                  (s) =>
                    appearance({ fishingStyle: s as 'SEATED' | 'STANDING' }),
                )}
                {fields(
                  characterColors,
                  'hairColor',
                  draft.appearance.hairColor,
                  (s) =>
                    appearance({
                      hairColor: s as CharacterAppearance['hairColor'],
                    }),
                )}
              </div>
              <FormError error={save.error} />
            </Form>
          )}
          {tab === 'market' && (
            <>
              <div className={styles.filters}>
                <CharacterChoice
                  name="slot"
                  label={t('fashion.category')}
                  value={slot}
                  options={[...characterSlots, 'DYE', 'PATTERN'].map(
                    (value) => ({ value, label: slotName(value) }),
                  )}
                  onChange={setSlot}
                />
                <CharacterChoice
                  name="sort"
                  label={t('fashion.sort')}
                  value={sort}
                  options={[
                    'PRICE_ASC',
                    'PRICE_DESC',
                    'RARITY',
                    'NEWEST',
                    'POPULAR',
                  ].map((value) => ({
                    value,
                    label: t(`fashion.sort.${value}` as MessageKey),
                  }))}
                  onChange={setSort}
                />
                <CharacterChoice
                  name="rarity"
                  label={t('fashion.rarity')}
                  value={rarity}
                  options={[
                    'ALL',
                    'COMMON',
                    'UNCOMMON',
                    'RARE',
                    'EPIC',
                    'LEGENDARY',
                    'MYTHICAL',
                  ].map((value) => ({
                    value,
                    label: t(`fashion.rarity.${value}` as MessageKey),
                  }))}
                  onChange={setRarity}
                />
                <CharacterChoice
                  name="currency"
                  label={t('fashion.currency')}
                  value={currency}
                  options={['ALL', 'FREE', 'LEVEL', 'GOLD', 'DIAMOND'].map(
                    (value) => ({
                      value,
                      label: t(`fashion.currency.${value}` as MessageKey),
                    }),
                  )}
                  onChange={setCurrency}
                />
                <Checkbox
                  label={t('fashion.ownedOnly')}
                  checked={ownedOnly}
                  onChange={(e) => {
                    setOwnedOnly(e.target.checked);
                    setUnownedOnly(false);
                  }}
                />
                <Checkbox
                  label={t('fashion.unownedOnly')}
                  checked={unownedOnly}
                  onChange={(e) => {
                    setUnownedOnly(e.target.checked);
                    setOwnedOnly(false);
                  }}
                />
              </div>
              <div className={styles.catalogGrid}>
                {filtered.map((c) => (
                  <Card
                    padded
                    key={c.id}
                    className={`${styles.card} ${selectedItem(c) ? styles.selected : ''}`}
                  >
                    <CharacterThumbnail
                      appearance={draft.appearance}
                      equipment={visualEquipment(
                        characterSlots.includes(
                          c.slot as (typeof characterSlots)[number],
                        )
                          ? { ...draft.equipment, [c.slot]: c.id }
                          : draft.equipment,
                      )}
                      presetId={draft.presetId}
                    />
                    <div className={styles.row}>
                      <RarityBadge rarity={c.rarity} />
                      {c.owned && (
                        <Badge>
                          <Check size={12} />
                          {t('fashion.owned')}
                        </Badge>
                      )}
                    </div>
                    <h3>{itemName(c)}</h3>
                    <p>
                      {(locale === 'en'
                        ? c.descriptionEn || c.descriptionVi
                        : c.descriptionVi || c.descriptionEn) ||
                        t('fashion.itemDescription', {
                          slot: slotName(c.slot),
                          level: c.minLevel,
                        })}
                    </p>
                    {c.endsAt && (
                      <p>
                        {t('fashion.saleEnds', {
                          date: new Date(c.endsAt).toLocaleString(localeTag()),
                        })}
                      </p>
                    )}
                    {!c.owned &&
                      !['GOLD', 'DIAMOND'].includes(c.unlockType) && (
                        <p>
                          {t('fashion.levelRequired', { level: c.minLevel })}
                        </p>
                      )}
                    <div className={styles.row}>
                      <Button variant="secondary" onClick={() => chooseItem(c)}>
                        {t('fashion.try')}
                      </Button>
                      {!c.owned &&
                        ['GOLD', 'DIAMOND'].includes(c.unlockType) && (
                          <Button
                            disabled={!c.active || player.level < c.minLevel}
                            onClick={() => {
                              purchaseKey.current = crypto.randomUUID();
                              purchase.reset();
                              setBuying(c);
                            }}
                          >
                            {c.unlockType === 'GOLD' ? (
                              <CurrencyAmount value={c.priceGold} />
                            ) : (
                              t('fashion.diamonds', { count: c.priceDiamonds })
                            )}
                          </Button>
                        )}
                    </div>
                  </Card>
                ))}
              </div>
              {!filtered.length && (
                <EmptyState compact title={t('fashion.noItems')} />
              )}
              {characterSlots.includes(
                slot as (typeof characterSlots)[number],
              ) &&
                !['HAIR', 'UPPER', 'LOWER', 'SHOES'].includes(slot) && (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      update({
                        equipment: { ...draft.equipment, [slot]: null },
                      })
                    }
                  >
                    {t('fashion.removeSlot', { slot: slotName(slot) })}
                  </Button>
                )}
              <h3>{t('fashion.dyes')}</h3>
              <div className={styles.grid}>
                <CharacterChoice
                  name="dyeSlot"
                  label={t('fashion.dyeSlot')}
                  value={
                    characterSlots.includes(
                      slot as (typeof characterSlots)[number],
                    )
                      ? slot
                      : 'UPPER'
                  }
                  options={characterSlots.map((value) => ({
                    value,
                    label: slotName(value),
                  }))}
                  onChange={setSlot}
                />
                <CharacterChoice
                  name="dyeColor"
                  label={t('fashion.dyeColor')}
                  value={
                    draft.appearance.dyes[slot as keyof CharacterEquipment] ??
                    draft.appearance.clothColor
                  }
                  options={options(characterColors)}
                  onChange={(s) => {
                    const dyeSlot = characterSlots.includes(
                      slot as (typeof characterSlots)[number],
                    )
                      ? slot
                      : 'UPPER';
                    appearance({
                      dyes: { ...draft.appearance.dyes, [dyeSlot]: s },
                    });
                  }}
                />
                {fields(
                  fashionPatterns,
                  'pattern',
                  draft.appearance.pattern,
                  (s) =>
                    appearance({
                      pattern: s as CharacterAppearance['pattern'],
                    }),
                )}
                {fields(
                  ['LINEN', 'SILK', 'BROCADE'],
                  'fabric',
                  draft.appearance.fabric,
                  (s) =>
                    appearance({ fabric: s as CharacterAppearance['fabric'] }),
                )}
                {fields(
                  characterColors,
                  'trimColor',
                  draft.appearance.trimColor,
                  (s) =>
                    appearance({
                      trimColor: s as CharacterAppearance['trimColor'],
                    }),
                )}
              </div>
              <h3>{t('fashion.collections')}</h3>
              {collections.isPending ? (
                <LoadingState />
              ) : collections.error ? (
                <ErrorState
                  error={collections.error}
                  retry={() => void collections.refetch()}
                />
              ) : (
                <div className={styles.catalogGrid}>
                  {collections.data?.items.map((c) => {
                    const items = c.itemIds
                        .map((id) => catalog.cosmetics.find((i) => i.id === id))
                        .filter((i): i is CosmeticDto => !!i),
                      missing = items.filter((i) => !i.owned),
                      collectionCurrency =
                        missing.length &&
                        missing.every((i) => i.unlockType === 'DIAMOND')
                          ? 'DIAMOND'
                          : 'GOLD',
                      total =
                        (missing.reduce(
                          (n, i) =>
                            n +
                            BigInt(
                              collectionCurrency === 'GOLD'
                                ? i.priceGold
                                : i.priceDiamonds,
                            ),
                          0n,
                        ) *
                          BigInt(100 - c.discountPercent)) /
                        100n;
                    return (
                      <Card padded key={c.id} className={styles.card}>
                        <h3>
                          {catalog.presets.some((preset) => preset.id === c.id)
                            ? t(`character.preset.${c.id}` as MessageKey)
                            : c.name}
                        </h3>
                        <p>
                          {t('fashion.collectionDiscount', {
                            discount: c.discountPercent,
                            count: missing.length,
                          })}
                        </p>
                        <div className={styles.row}>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              const equipment = { ...draft.equipment };
                              for (const i of items)
                                if (
                                  characterSlots.includes(
                                    i.slot as (typeof characterSlots)[number],
                                  )
                                )
                                  equipment[
                                    i.slot as keyof CharacterEquipment
                                  ] = i.id;
                              update({ equipment });
                            }}
                          >
                            {t('fashion.try')}
                          </Button>
                          {missing.length > 0 && (
                            <Button
                              disabled={
                                action.isPending ||
                                missing.some(
                                  (i) =>
                                    i.unlockType !== collectionCurrency ||
                                    i.minLevel > player.level,
                                )
                              }
                              onClick={() =>
                                action.mutate({
                                  path: '/fashion/collections/order',
                                  body: {
                                    collectionId: c.id,
                                    expectedVersion: c.version,
                                    currency: collectionCurrency,
                                    expectedTotal: total.toString(),
                                  },
                                })
                              }
                            >
                              {collectionCurrency === 'GOLD' ? (
                                <CurrencyAmount value={total.toString()} />
                              ) : (
                                t('fashion.diamonds', {
                                  count: total.toString(),
                                })
                              )}
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
          {(tab === 'wardrobe' || tab === 'community') && (
            <>
              {tab === 'wardrobe' && outfits.data && (
                <Notice>
                  {t('fashion.wardrobeCapacity', {
                    count: outfits.data.items.length,
                    capacity: outfits.data.capacity,
                  })}
                </Notice>
              )}
              <div className={styles.row}>
                {tab === 'wardrobe' ? (
                  <Button onClick={() => openSave(null)}>
                    <Save size={16} />
                    {t('fashion.saveOutfit')}
                  </Button>
                ) : (
                  <Checkbox
                    checked={following}
                    onChange={(e) => setFollowing(e.target.checked)}
                    label={t('fashion.followingOnly')}
                  />
                )}
              </div>
              {(tab === 'wardrobe' ? outfits : community).isPending ? (
                <LoadingState />
              ) : (tab === 'wardrobe' ? outfits : community).error ? (
                <ErrorState
                  error={(tab === 'wardrobe' ? outfits : community).error}
                  retry={() =>
                    void (tab === 'wardrobe' ? outfits : community).refetch()
                  }
                />
              ) : (
                <div className={styles.catalogGrid}>
                  {(tab === 'wardrobe' ? outfits : community).data?.items.map(
                    (o) => (
                      <Card padded key={o.id} className={styles.card}>
                        <CharacterThumbnail
                          appearance={o.appearance}
                          equipment={visualEquipment(o.equipment)}
                          presetId={draft.presetId}
                        />
                        <h3>{o.name}</h3>
                        <p>
                          {o.username} ·{' '}
                          {t('fashion.likes', { count: o.likes })}
                        </p>
                        <div className={styles.row}>
                          <Button
                            variant="secondary"
                            onClick={() => tryOutfit(o)}
                          >
                            {t('fashion.copyToTry')}
                          </Button>
                          {o.userId === player.id ? (
                            <>
                              <Button
                                disabled={!initial || equip.isPending}
                                onClick={() => equip.mutate(o)}
                              >
                                {t('fashion.equipOutfit')}
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => openSave(o)}
                              >
                                {t('fashion.rename')}
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => openSave(o, true)}
                              >
                                <Copy size={14} />
                                {t('fashion.duplicate')}
                              </Button>
                              <Button
                                variant="danger"
                                onClick={() => setDeleteOutfit(o)}
                              >
                                <Trash2 size={14} />
                                {t('fashion.delete')}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                disabled={action.isPending}
                                onClick={() =>
                                  action.mutate({
                                    path: `/fashion/outfits/${o.id}/like`,
                                    body: { liked: !o.liked },
                                  })
                                }
                              >
                                <Heart size={14} />
                                {o.liked
                                  ? t('fashion.unlike')
                                  : t('fashion.like')}
                              </Button>
                              <Button
                                variant="ghost"
                                disabled={action.isPending}
                                onClick={() =>
                                  action.mutate({
                                    path: `/fashion/players/${o.userId}/follow`,
                                    body: { following: !o.following },
                                  })
                                }
                              >
                                {t(
                                  o.following
                                    ? 'fashion.unfollow'
                                    : 'fashion.follow',
                                )}
                              </Button>
                            </>
                          )}
                          {o.isPublic && (
                            <Button
                              variant="ghost"
                              onClick={() => void share(o)}
                            >
                              <Share2 size={14} />
                              {t('fashion.share')}
                            </Button>
                          )}
                        </div>
                      </Card>
                    ),
                  )}
                </div>
              )}
              {!(tab === 'wardrobe' ? outfits : community).isPending &&
                (tab === 'wardrobe' ? outfits : community).data?.items
                  .length === 0 && (
                  <EmptyState
                    compact
                    title={t('fashion.noOutfits')}
                    description={t('fashion.noOutfitsDescription')}
                  />
                )}
            </>
          )}
          {tab === 'events' && (
            <>
              <FashionPasses />
              <Notice>{t('fashion.eventPolicy')}</Notice>
              {events.isPending ? (
                <LoadingState />
              ) : events.error ? (
                <ErrorState
                  error={events.error}
                  retry={() => void events.refetch()}
                />
              ) : events.data?.items.length === 0 ? (
                <EmptyState
                  title={t('fashion.noEvents')}
                  description={t('fashion.noEventsDescription')}
                />
              ) : (
                events.data?.items.map((e) => (
                  <Card padded key={e.id} className={styles.card}>
                    <h3>{e.name}</h3>
                    <p>{e.theme}</p>
                    <p>
                      {t('fashion.eventDates', {
                        start: new Date(e.startsAt).toLocaleString(localeTag()),
                        end: new Date(e.endsAt).toLocaleString(localeTag()),
                      })}
                    </p>
                    <CurrencyAmount value={e.rewardGold} />
                    {Date.now() < Date.parse(e.endsAt) &&
                      Date.now() >= Date.parse(e.startsAt) &&
                      !e.entered && (
                        <div className={styles.row}>
                          <CharacterChoice
                            name="eventOutfit"
                            label={t('fashion.chooseOutfit')}
                            value={entryOutfit}
                            options={[
                              { value: '', label: t('fashion.chooseOutfit') },
                              ...(outfits.data?.items ?? []).map((o) => ({
                                value: o.id,
                                label: o.name,
                              })),
                            ]}
                            onChange={setEntryOutfit}
                          />
                          <Button
                            disabled={!entryOutfit || action.isPending}
                            onClick={() =>
                              action.mutate({
                                path: `/fashion/events/${e.id}/enter`,
                                body: { outfitId: entryOutfit },
                              })
                            }
                          >
                            {t('fashion.enter')}
                          </Button>
                        </div>
                      )}
                    {e.entered && Date.now() >= Date.parse(e.endsAt) && (
                      <Button
                        disabled={e.claimed || action.isPending}
                        onClick={() =>
                          action.mutate({
                            path: `/fashion/events/${e.id}/claim`,
                            body: {},
                          })
                        }
                      >
                        {e.claimed ? t('fashion.claimed') : t('fashion.claim')}
                      </Button>
                    )}
                    <div className={styles.catalogGrid}>
                      {e.entries.map((entry) => (
                        <Card padded key={entry.id} className={styles.card}>
                          <h4>{entry.outfit.name}</h4>
                          <p>
                            {entry.username} ·{' '}
                            {t('fashion.votes', { count: entry.votes })}
                          </p>
                          <Button
                            variant="secondary"
                            onClick={() => tryOutfit(entry.outfit)}
                          >
                            {t('fashion.try')}
                          </Button>
                          {entry.userId !== player.id &&
                            Date.now() < Date.parse(e.endsAt) && (
                              <Button
                                disabled={action.isPending || entry.voted}
                                onClick={() =>
                                  action.mutate({
                                    path: `/fashion/events/${e.id}/vote`,
                                    body: { entryId: entry.id },
                                  })
                                }
                              >
                                {t('fashion.vote')}
                              </Button>
                            )}
                        </Card>
                      ))}
                    </div>
                  </Card>
                ))
              )}
            </>
          )}
        </div>
      </div>
      {tab !== 'appearance' && (
        <Form
          id="character-form"
          error={save.error}
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <FormField label={t('character.name')} required>
            <Input
              name="name"
              required
              minLength={2}
              maxLength={24}
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </FormField>
          <FormError error={save.error} />
        </Form>
      )}
      <BottomActions>
        <Button
          variant="ghost"
          disabled={save.isPending}
          onClick={() => navigate(initial ? '/play' : '/')}
        >
          {t('character.cancel')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            update(fresh());
            save.reset();
          }}
        >
          <RotateCcw size={15} />
          {t('character.reset')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            const random = new Uint32Array(1);
            crypto.getRandomValues(random);
            applyPreset(catalog.presets[random[0] % catalog.presets.length].id);
            const random2 = new Uint32Array(1);
            crypto.getRandomValues(random2);
            setDraft((d) => ({
              ...d,
              appearance: {
                ...d.appearance,
                clothColor: characterColors[random2[0] % 8],
              },
            }));
          }}
        >
          <Shuffle size={15} />
          {t('character.random')}
        </Button>
        <Button type="submit" form="character-form" loading={save.isPending}>
          <Save size={15} />
          {t('character.save')}
        </Button>
      </BottomActions>
      <Modal
        open={!!buying}
        onClose={() => {
          if (!purchase.isPending) setBuying(null);
        }}
        title={t('fashion.buyTitle')}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={purchase.isPending}
              onClick={() => setBuying(null)}
            >
              {t('character.cancel')}
            </Button>
            <Button
              loading={purchase.isPending}
              disabled={
                !!buying &&
                (buying.unlockType === 'DIAMOND'
                  ? BigInt(wallet.data?.diamonds ?? '0') <
                    BigInt(buying.priceDiamonds)
                  : BigInt(player.gold) < BigInt(buying.priceGold))
              }
              onClick={() => purchase.mutate()}
            >
              {t('fashion.confirmBuy')}
            </Button>
          </>
        }
      >
        {buying && (
          <>
            <h3>{itemName(buying)}</h3>
            {buying.unlockType === 'DIAMOND' ? (
              <p>{t('fashion.diamonds', { count: buying.priceDiamonds })}</p>
            ) : (
              <CurrencyAmount value={buying.priceGold} />
            )}
            <p>
              {t('fashion.currentBalance', {
                gold: player.gold,
                diamonds: wallet.data?.diamonds ?? '0',
              })}
            </p>
            {buying.unlockType === 'GOLD' &&
              BigInt(player.gold) < BigInt(buying.priceGold) && (
                <Notice tone="warning">
                  {t('fashion.shortGold', {
                    amount: (
                      BigInt(buying.priceGold) - BigInt(player.gold)
                    ).toString(),
                  })}
                </Notice>
              )}
            {buying.unlockType === 'DIAMOND' &&
              BigInt(wallet.data?.diamonds ?? '0') <
                BigInt(buying.priceDiamonds) && (
                <Notice tone="warning">
                  {t('fashion.shortDiamonds', {
                    amount: (
                      BigInt(buying.priceDiamonds) -
                      BigInt(wallet.data?.diamonds ?? '0')
                    ).toString(),
                  })}{' '}
                  <Link to="/play/payments">{t('fashion.topup')}</Link>
                </Notice>
              )}
            <FormError error={purchase.error} />
          </>
        )}
      </Modal>
      <Modal
        open={outfitModal}
        onClose={() => {
          if (!outfitSave.isPending) setOutfitModal(false);
        }}
        title={t('fashion.saveOutfit')}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={outfitSave.isPending}
              onClick={() => setOutfitModal(false)}
            >
              {t('character.cancel')}
            </Button>
            <Button
              form={outfitForm}
              type="submit"
              loading={outfitSave.isPending}
            >
              {t('fashion.saveOutfit')}
            </Button>
          </>
        }
      >
        <Form
          id={outfitForm}
          error={outfitSave.error}
          onSubmit={(e) => {
            e.preventDefault();
            outfitSave.mutate();
          }}
        >
          <FormField label={t('fashion.outfitName')} required>
            <Input
              name="name"
              required
              minLength={2}
              maxLength={40}
              value={outfitName}
              onChange={(e) => setOutfitName(e.target.value)}
            />
          </FormField>
          <Checkbox
            label={t('fashion.publicOutfit')}
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          <FormError error={outfitSave.error} />
        </Form>
      </Modal>
      <Modal
        open={!!deleteOutfit}
        onClose={() => {
          if (!action.isPending) setDeleteOutfit(null);
        }}
        title={t('fashion.delete')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOutfit(null)}>
              {t('character.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={action.isPending}
              onClick={() =>
                action.mutate(
                  {
                    path: `/fashion/outfits/${deleteOutfit!.id}`,
                    method: 'DELETE',
                    body: { expectedVersion: deleteOutfit!.version },
                  },
                  { onSuccess: () => setDeleteOutfit(null) },
                )
              }
            >
              {t('fashion.delete')}
            </Button>
          </>
        }
      >
        <p>{t('fashion.deleteConfirm', { name: deleteOutfit?.name ?? '' })}</p>
      </Modal>
    </>
  );
}
