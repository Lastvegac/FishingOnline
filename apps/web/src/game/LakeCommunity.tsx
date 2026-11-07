import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CatchDto, LakeCommunityDto } from '@fwo/contracts';
import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  FishArt,
  Form,
  FormError,
  FormField,
  LoadingState,
  Textarea,
  formatWeight,
  localeTag,
  useI18n,
} from '@fwo/ui';
import { api } from '../data';
import styles from './game.module.css';

export function LakeCommunity({
  locationId,
  caught,
}: {
  locationId: string;
  caught?: CatchDto;
}) {
  const { t } = useI18n(),
    cache = useQueryClient();
  const [text, setText] = useState(''),
    [share, setShare] = useState(false);
  const pending = useRef<{ body: string; key: string } | null>(null);
  const key = ['lake-community', locationId];
  const query = useQuery({
    queryKey: key,
    queryFn: () =>
      api.request<LakeCommunityDto>(
        `/fishing/locations/${locationId}/community`,
      ),
    refetchInterval: 5000,
  });
  const send = useMutation({
    mutationFn: () => {
      const body = { text, ...(share && caught ? { catchId: caught.id } : {}) };
      const encoded = JSON.stringify(body);
      if (pending.current?.body !== encoded)
        pending.current = { body: encoded, key: crypto.randomUUID() };
      return api.request(`/fishing/locations/${locationId}/messages`, {
        method: 'POST',
        body,
        idempotencyKey: pending.current!.key,
      });
    },
    onSuccess: () => {
      pending.current = null;
      setText('');
      setShare(false);
      void cache.invalidateQueries({ queryKey: key });
    },
  });
  return (
    <Card className={styles.community}>
      <h3>{t('sim.community')}</h3>
      {query.isPending ? (
        <LoadingState />
      ) : query.error ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        query.data && (
          <>
            <p>{t('sim.anglers', { count: query.data.anglers.length })}</p>
            <h4>{t('sim.weekly')}</h4>
            <p>
              {t('sim.weekEnds', {
                date: new Date(query.data.week.endsAt).toLocaleString(
                  localeTag(),
                  { dateStyle: 'short', timeStyle: 'short' },
                ),
              })}
            </p>
            {query.data.week.entries.length ? (
              <ol className={styles.weekly}>
                {query.data.week.entries.map((entry) => (
                  <li key={entry.userId}>
                    <span>{entry.username}</span>
                    <strong>{formatWeight(entry.weightG)}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                compact
                title={t('sim.weeklyEmpty')}
                description={t('sim.weeklyHelp')}
              />
            )}
            <h4>{t('sim.chat')}</h4>
            <div
              className={styles.messages}
              role="log"
              aria-label={t('sim.chat')}
              aria-live="off"
            >
              {query.data.messages.length ? (
                query.data.messages.map((message) => (
                  <article key={message.id}>
                    <strong>{message.username}</strong>
                    <time dateTime={message.createdAt}>
                      {new Date(message.createdAt).toLocaleTimeString(
                        localeTag(),
                        { hour: '2-digit', minute: '2-digit' },
                      )}
                    </time>
                    <p>{message.text}</p>
                    {message.catch && (
                      <div className={styles.sharedCatch}>
                        <FishArt
                          slug={message.catch.fish.slug}
                          imageKey={message.catch.fish.imageKey}
                        />
                        <span>
                          {message.catch.fish.name} ·{' '}
                          {formatWeight(message.catch.weightG)}
                        </span>
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <EmptyState
                  compact
                  title={t('sim.chatEmpty')}
                  description={t('sim.chatHelp')}
                />
              )}
            </div>
            <Form
              error={send.error}
              onSubmit={(event) => {
                event.preventDefault();
                if (!send.isPending) send.mutate();
              }}
            >
              <FormField label={t('sim.message')}>
                <Textarea
                  name="text"
                  required
                  maxLength={280}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </FormField>
              {caught && (
                <Checkbox
                  label={t('sim.shareCatch')}
                  checked={share}
                  onChange={(e) => setShare(e.target.checked)}
                />
              )}
              <FormError error={send.error} />
              <Button type="submit" loading={send.isPending}>
                {t('sim.send')}
              </Button>
            </Form>
          </>
        )
      )}
    </Card>
  );
}
