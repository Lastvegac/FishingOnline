import { useQuery } from '@tanstack/react-query';
import type {
  CharacterDto,
  CharacterCatalogDto,
  OutfitDto,
  FashionEventDto,
  FashionCollectionDto,
  FashionWalletDto,
} from '@fwo/contracts';
import { api, useAuth, queryClient, syncPlayer } from './data';
export const useCharacter = () =>
  useQuery({
    queryKey: ['character'],
    queryFn: () => api.request<CharacterDto | null>('/characters/me'),
    enabled: !!useAuth((s) => s.player),
  });
export const useCharacterCatalog = () =>
  useQuery({
    queryKey: ['character-catalog'],
    queryFn: () => api.request<CharacterCatalogDto>('/characters/catalog'),
  });
export const useOutfits = (community?: 'all' | 'following') =>
  useQuery({
    queryKey: ['outfits', community ?? 'mine'],
    queryFn: () =>
      api.request<{ items: OutfitDto[]; capacity: number }>(
        `/fashion/outfits${community ? `?community=${community}` : ''}`,
      ),
  });
export const useFashionEvents = () =>
  useQuery({
    queryKey: ['fashion-events'],
    queryFn: () => api.request<{ items: FashionEventDto[] }>('/fashion/events'),
  });
export const useFashionCollections = () =>
  useQuery({
    queryKey: ['fashion-collections'],
    queryFn: () =>
      api.request<{ items: FashionCollectionDto[] }>('/fashion/collections'),
  });
export const useFashionWallet = () =>
  useQuery({
    queryKey: ['fashion-wallet'],
    queryFn: () => api.request<FashionWalletDto>('/fashion/wallet'),
  });
export async function invalidateFashion() {
  await Promise.all([
    syncPlayer(),
    ...[
      'character',
      'character-catalog',
      'outfits',
      'fashion-wallet',
      'fashion-events',
      'inventory',
      'wallet-transactions',
    ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
  ]);
}
