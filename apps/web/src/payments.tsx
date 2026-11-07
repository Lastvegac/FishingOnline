import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { CreditCard, CheckCircle, Package, Diamond } from 'lucide-react';
import {
  Badge,
  BottomActions,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Form,
  FormError,
  FormField,
  Input,
  LoadingState,
  Modal,
  Notice,
  PageHeader,
  Select,
  formatNumber,
  localeTag,
  t,
  useI18n,
  useToast,
  localizeMessage,
} from '@fwo/ui';
import { paymentEventSchema, paymentCatalogSchema } from '@fwo/contracts';
import type {
  InventoryDto,
  PaymentCatalogDto,
  PaymentMethod,
  PaymentOrderDto,
  PaymentProductDto,
} from '@fwo/contracts';
import { api, invalidateGame, queryClient, useAuth } from './data';
import { EquipmentArt } from './art';
import styles from './payments.module.css';

export const methodLabel = (method: PaymentMethod) =>
  t(`payments.method.${method}`);
export const statusLabel = (status: PaymentOrderDto['status']) =>
  t(`payments.${status}`);
const money = (value: string) => `${formatNumber(value)} ₫`;
const watchKey = (userId: string) => `fwo:payment:watch:${userId}`;
function readWatch(userId: string) {
  try {
    return sessionStorage.getItem(watchKey(userId));
  } catch {
    return null;
  }
}
function watch(userId: string, id: string | null) {
  try {
    if (id) sessionStorage.setItem(watchKey(userId), id);
    else sessionStorage.removeItem(watchKey(userId));
  } catch {
    /* Private browsing still receives live events. */
  }
}
export function PaymentStatus({ order }: { order: PaymentOrderDto }) {
  useI18n();
  return (
    <Badge
      tone={
        order.status === 'PAID'
          ? 'success'
          : ['PENDING', 'PROCESSING'].includes(order.status)
            ? 'warning'
            : 'danger'
      }
    >
      {statusLabel(order.status)}
    </Badge>
  );
}
function ReceivedItems({ order }: { order: PaymentOrderDto }) {
  return (
    <ul className={styles.items}>
      {order.items.map((item) => (
        <li key={item.id}>
          <Package size={17} aria-hidden="true" />
          <span>
            {item.kind === 'DIAMOND'
              ? t('fashion.currency.DIAMOND')
              : item.name}
          </span>
          <strong>×{formatNumber(item.quantity)}</strong>
        </li>
      ))}
    </ul>
  );
}
/** Mounted for the whole authenticated shell, including the live fishing route. */
export function PaymentUpdates() {
  useI18n();
  const userId = useAuth((s) => s.player!.id);
  const [receipts, setReceipts] = useState<PaymentOrderDto[]>([]);
  const received = receipts[0] ?? null;
  const [offline, setOffline] = useState(false);
  const navigate = useNavigate(),
    toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const seen = useRef(new Set<string>());
  const notifying = useRef(new Set<string>());
  useEffect(() => {
    let disposed = false,
      socket: WebSocket | undefined,
      reconnect: ReturnType<typeof setTimeout> | undefined;
    let failures = 0,
      connected = false,
      syncing = false,
      lastMessage = Date.now();
    const queued = new Map<string, PaymentOrderDto>();
    const known = new Map<string, PaymentOrderDto['status']>();
    const synchronize = async (candidate?: PaymentOrderDto) => {
      if (disposed) return;
      if (syncing) {
        if (candidate) queued.set(candidate.id, candidate);
        return;
      }
      syncing = true;
      try {
        const watched = readWatch(userId);
        const orders = await api.request<{
          items: PaymentOrderDto[];
          nextCursor: string | null;
        }>('/payments/orders');
        const result = candidate
          ? await api.request<PaymentOrderDto>(
              `/payments/orders/${candidate.id}`,
            )
          : watched
            ? (orders.items.find((o) => o.id === watched) ??
              (await api.request<PaymentOrderDto>(
                `/payments/orders/${watched}`,
              )))
            : undefined;
        const newlyPaid = orders.items.filter(
          (o) =>
            o.status === 'PAID' &&
            known.has(o.id) &&
            known.get(o.id) !== 'PAID',
        );
        for (const item of orders.items) known.set(item.id, item.status);
        await Promise.all([
          invalidateGame(),
          queryClient.fetchQuery({
            queryKey: ['inventory'],
            queryFn: () => api.request<InventoryDto>('/inventory'),
            staleTime: 0,
          }),
          queryClient.invalidateQueries({ queryKey: ['payment-orders'] }),
          queryClient.invalidateQueries({ queryKey: ['payment-order'] }),
          queryClient.invalidateQueries({ queryKey: ['payment-catalog'] }),
        ]);
        for (const receipt of [
          ...newlyPaid,
          ...(result?.status === 'PAID' ? [result] : []),
        ]) {
          if (
            !disposed &&
            !seen.current.has(receipt.id) &&
            !notifying.current.has(receipt.id)
          ) {
            notifying.current.add(receipt.id);
            setReceipts((current) => [...current, receipt]);
            toastRef.current(t('payments.delivered'));
          }
        }
      } finally {
        syncing = false;
        const next = queued.values().next().value;
        if (next && !disposed) {
          queued.delete(next.id);
          void synchronize(next).catch(() => setOffline(true));
        }
      }
    };
    const connect = async () => {
      if (disposed) return;
      try {
        const catalog =
          await api.request<PaymentCatalogDto>('/payments/catalog');
        if (disposed) return;
        // Keep delivery updates available for old orders even while checkout is disabled.
        if (catalog.environment === 'disabled' && !readWatch(userId)) return;
        const token = api.getAccessToken();
        if (!token) return;
        const url = new URL('/api/v1/payments/socket', window.location.origin);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        socket = new WebSocket(url);
        socket.onopen = () => {
          if (!disposed) socket!.send(JSON.stringify({ accessToken: token }));
        };
        socket.onmessage = (message) => {
          lastMessage = Date.now();
          try {
            const data: unknown = JSON.parse(String(message.data));
            if ((data as { event?: string }).event === 'payment:connected') {
              connected = true;
              failures = 0;
              setOffline(false);
              void synchronize().catch(() => setOffline(true));
              return;
            }
            const event = paymentEventSchema.safeParse(data);
            if (event.success) {
              void synchronize(event.data.data).catch(() => setOffline(true));
            }
          } catch {
            /* Reconnect/API synchronization recovers malformed frames. */
          }
        };
        socket.onerror = () => socket?.close();
        socket.onclose = () => {
          connected = false;
          if (disposed) return;
          setOffline(true);
          reconnect = setTimeout(
            () => {
              void connect();
            },
            Math.min(15000, 500 * 2 ** Math.min(failures++, 5)) +
              Math.random() * 300,
          );
        };
      } catch {
        if (!disposed) {
          setOffline(true);
          reconnect = setTimeout(() => {
            void connect();
          }, 3000);
        }
      }
    };
    void connect();
    const fallback = setInterval(() => {
      if (readWatch(userId)) void synchronize().catch(() => {});
      if (connected && Date.now() - lastMessage > 25000) socket?.close();
      else if (connected && socket?.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify({ event: 'payment:ping' }));
    }, 10000);
    const onOnline = () => {
      void synchronize().catch(() => {});
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onOnline);
    return () => {
      disposed = true;
      if (reconnect) clearTimeout(reconnect);
      clearInterval(fallback);
      socket?.close();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onOnline);
    };
  }, [userId]);
  const dismiss = () => {
    if (received) {
      seen.current.add(received.id);
      notifying.current.delete(received.id);
      if (readWatch(userId) === received.id) watch(userId, null);
    }
    setReceipts((current) => current.slice(1));
  };
  return (
    <>
      {offline && <Notice tone="warning">{t('payments.reconnecting')}</Notice>}
      <Modal
        open={!!received}
        title={t('payments.success')}
        onClose={dismiss}
        footer={
          <>
            <Button variant="secondary" onClick={dismiss}>
              {t('payments.close')}
            </Button>
            <Button
              onClick={() => {
                dismiss();
                navigate(
                  received?.items.some((item) => item.kind === 'DIAMOND')
                    ? '/play/character?tab=market'
                    : '/play/inventory',
                );
              }}
            >
              {t('payments.equip')}
            </Button>
          </>
        }
      >
        <CheckCircle
          className={styles.successIcon}
          size={40}
          aria-hidden="true"
        />
        <p>{t('payments.delivered')}</p>
        {received && <ReceivedItems order={received} />}
      </Modal>
    </>
  );
}

export function PaymentShop() {
  useI18n();
  const catalog = useQuery({
    queryKey: ['payment-catalog'],
    queryFn: async () =>
      paymentCatalogSchema.parse(await api.request('/payments/catalog')),
  });
  const [selected, setSelected] = useState<PaymentProductDto | null>(null),
    [quantity, setQuantity] = useState('1'),
    [method, setMethod] = useState<PaymentMethod>('VNPAY');
  const key = useRef(crypto.randomUUID());
  const formId = useId(),
    navigate = useNavigate();
  const userId = useAuth((s) => s.player!.id);
  const create = useMutation({
    mutationFn: () =>
      api.request<PaymentOrderDto>('/payments/orders', {
        method: 'POST',
        idempotencyKey: key.current,
        body: { productId: selected!.id, quantity: Number(quantity), method },
      }),
    onSuccess: (order) => {
      watch(userId, order.id);
      setSelected(null);
      void queryClient.invalidateQueries({ queryKey: ['payment-orders'] });
      navigate(`/play/payments?order=${order.id}`);
    },
  });
  const count = /^\d{1,3}$/.test(quantity) ? Number(quantity) : 0;
  return (
    <section className={styles.section}>
      <PageHeader
        titleAs="h2"
        title={t('payments.catalog')}
        description={t('payments.catalogHelp')}
        action={<Link to="/play/payments">{t('payments.history')}</Link>}
      />
      {catalog.isPending ? (
        <LoadingState />
      ) : catalog.error ? (
        <ErrorState
          error={catalog.error}
          retry={() => void catalog.refetch()}
        />
      ) : (
        <>
          {!catalog.data.methods.length && (
            <Notice tone="info">{t('payments.disabled')}</Notice>
          )}
          {catalog.data.environment === 'sandbox' && (
            <Notice tone="warning">{t('payments.sandbox')}</Notice>
          )}
          {catalog.data.items.length === 0 ? (
            <EmptyState title={t('payments.empty')} />
          ) : (
            <div className={styles.grid}>
              {catalog.data.items.map((product) => (
                <Card padded key={product.id} className={styles.product}>
                  <div className={styles.art}>
                    {product.items[0]?.kind === 'DIAMOND' ? (
                      <Diamond size={52} />
                    ) : (
                      <EquipmentArt kind={product.items[0]?.kind ?? 'ROD'} />
                    )}
                  </div>
                  <h3>{localizeMessage(product.name)}</h3>
                  <p>{localizeMessage(product.description)}</p>
                  <ul className={styles.items}>
                    {product.items.map((i) => (
                      <li key={i.itemId}>
                        <span>
                          {i.kind === 'DIAMOND'
                            ? t('fashion.currency.DIAMOND')
                            : i.name}
                        </span>
                        <strong>×{formatNumber(i.quantity)}</strong>
                      </li>
                    ))}
                  </ul>
                  <BottomActions>
                    <strong>{money(product.amountVnd)}</strong>
                    <Button
                      disabled={!catalog.data.methods.length}
                      onClick={() => {
                        create.reset();
                        key.current = crypto.randomUUID();
                        setQuantity('1');
                        setMethod(catalog.data.methods[0]!);
                        setSelected(product);
                      }}
                    >
                      <CreditCard size={16} />
                      {t(
                        catalog.data.methods.length
                          ? 'payments.buy'
                          : 'payments.unavailable',
                      )}
                    </Button>
                  </BottomActions>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
      <Modal
        open={!!selected}
        title={selected ? localizeMessage(selected.name) : t('payments.buy')}
        onClose={() => {
          if (!create.isPending) setSelected(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={create.isPending}
              onClick={() => setSelected(null)}
            >
              {t('payments.close')}
            </Button>
            <Button type="submit" form={formId} loading={create.isPending}>
              {t('payments.confirm')}
            </Button>
          </>
        }
      >
        {selected && (
          <Form
            id={formId}
            error={create.error}
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <p>{localizeMessage(selected.description)}</p>
            <FormField label={t('payments.quantity')} required>
              <Input
                name="quantity"
                type="number"
                required
                step={1}
                min={1}
                max={selected.maxQuantity}
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  key.current = crypto.randomUUID();
                }}
              />
            </FormField>
            <FormField label={t('payments.method')} required>
              <Select
                name="method"
                required
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value as PaymentMethod);
                  key.current = crypto.randomUUID();
                }}
              >
                {catalog.data?.methods.map((m) => (
                  <option key={m} value={m}>
                    {methodLabel(m)}
                  </option>
                ))}
              </Select>
            </FormField>
            <p className={styles.total}>
              {t('payments.total')}{' '}
              <strong>
                {money(
                  (
                    BigInt(selected.amountVnd) * BigInt(Math.min(100, count))
                  ).toString(),
                )}
              </strong>
            </p>
            <FormError error={create.error} />
          </Form>
        )}
      </Modal>
    </section>
  );
}
export function PaymentsPage() {
  useI18n();
  const [params, setParams] = useSearchParams();
  const selected = params.get('order');
  const userId = useAuth((s) => s.player!.id);
  const history = useInfiniteQuery({
    queryKey: ['payment-orders'],
    initialPageParam: '',
    queryFn: ({ pageParam }) =>
      api.request<{ items: PaymentOrderDto[]; nextCursor: string | null }>(
        `/payments/orders${pageParam ? `?cursor=${pageParam}` : ''}`,
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const order = useQuery({
    queryKey: ['payment-order', selected],
    enabled: !!selected,
    queryFn: () => api.request<PaymentOrderDto>(`/payments/orders/${selected}`),
    refetchInterval: (q) =>
      ['PENDING', 'PROCESSING'].includes(q.state.data?.status ?? '')
        ? 3000
        : false,
  });
  const checkout = useMutation({
    mutationFn: () =>
      api.request<PaymentOrderDto>(`/payments/orders/${selected}/checkout`, {
        method: 'POST',
        body: {},
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(['payment-order', selected], result);
      if (result.paymentUrl) {
        watch(userId, result.id);
        window.location.assign(result.paymentUrl);
      }
    },
  });
  const check = useMutation({
    mutationFn: () =>
      api.request<PaymentOrderDto>(`/payments/orders/${selected}/check`, {
        method: 'POST',
        body: {},
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(['payment-order', selected], result);
      void queryClient.invalidateQueries({ queryKey: ['payment-orders'] });
      void invalidateGame();
    },
  });
  const choose = (id: string) => {
    check.reset();
    checkout.reset();
    setParams({ order: id });
  };
  return (
    <>
      <PageHeader
        title={t('payments.title')}
        action={<Link to="/play/shop">{t('payments.shop')}</Link>}
      />
      {selected &&
        (order.isPending ? (
          <LoadingState />
        ) : order.error ? (
          <ErrorState error={order.error} retry={() => void order.refetch()} />
        ) : (
          <Card padded className={styles.detail}>
            <div className={styles.titleRow}>
              <h2>{localizeMessage(order.data.productName)}</h2>
              <PaymentStatus order={order.data} />
            </div>
            <dl className={styles.facts}>
              <div>
                <dt>{t('payments.order')}</dt>
                <dd>{order.data.orderCode}</dd>
              </div>
              <div>
                <dt>{t('payments.total')}</dt>
                <dd>{money(order.data.totalAmount)}</dd>
              </div>
              <div>
                <dt>{t('payments.method')}</dt>
                <dd>{methodLabel(order.data.method)}</dd>
              </div>
              <div>
                <dt>{t('payments.expires')}</dt>
                <dd>
                  {new Date(order.data.expiresAt).toLocaleString(localeTag())}
                </dd>
              </div>
            </dl>
            <ReceivedItems order={order.data} />
            <Notice tone={order.data.status === 'PAID' ? 'success' : 'info'}>
              {t(
                order.data.status === 'PAID'
                  ? 'payments.delivered'
                  : order.data.status === 'PROCESSING'
                    ? 'payments.processingHelp'
                    : order.data.status === 'PENDING'
                      ? 'payments.pendingHelp'
                      : 'payments.failedHelp',
              )}
            </Notice>
            {order.data.status === 'PROCESSING' && (
              <LoadingState label={t('payments.PROCESSING')} />
            )}
            <FormError error={checkout.error ?? check.error} />
            <BottomActions>
              {order.data.status === 'PENDING' && (
                <Button
                  loading={checkout.isPending}
                  disabled={check.isPending}
                  onClick={() => checkout.mutate()}
                >
                  {t('payments.continue')}
                </Button>
              )}
              {order.data.status !== 'PAID' && (
                <Button
                  variant="secondary"
                  loading={check.isPending}
                  disabled={checkout.isPending}
                  onClick={() => check.mutate()}
                >
                  {t('payments.check')}
                </Button>
              )}
              {order.data.status === 'PAID' && (
                <Link
                  to={
                    order.data.items.some((item) => item.kind === 'DIAMOND')
                      ? '/play/character?tab=market'
                      : '/play/inventory'
                  }
                >
                  {t('payments.equip')}
                </Link>
              )}
            </BottomActions>
          </Card>
        ))}
      <h2>{t('payments.history')}</h2>
      {history.isPending ? (
        <LoadingState />
      ) : history.error ? (
        <ErrorState
          error={history.error}
          retry={() => void history.refetch()}
        />
      ) : history.data.pages[0]!.items.length === 0 ? (
        <EmptyState title={t('payments.noOrders')} />
      ) : (
        <div className={styles.history}>
          {history.data.pages
            .flatMap((page) => page.items)
            .map((item) => (
              <Card padded key={item.id}>
                <div className={styles.titleRow}>
                  <strong>{localizeMessage(item.productName)}</strong>
                  <PaymentStatus order={item} />
                </div>
                <p className={styles.code}>{item.orderCode}</p>
                <p>
                  {money(item.totalAmount)} · {methodLabel(item.method)}
                </p>
                <Button variant="secondary" onClick={() => choose(item.id)}>
                  {t('payments.view')}
                </Button>
              </Card>
            ))}
          {history.hasNextPage && (
            <Button
              variant="secondary"
              loading={history.isFetchingNextPage}
              onClick={() => void history.fetchNextPage()}
            >
              {t('payments.more')}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
