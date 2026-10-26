import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { citizenFetch } from "@/lib/citizen";
import { useCitizenViewerScope, type CitizenProfile, type CitizenViewerScope } from "@/hooks/use-citizen";

export type ListingType = "market" | "service";

export interface CitizenListing {
  id: number;
  type: ListingType;
  title: string;
  description: string;
  price: number;
  city: string | null;
  createdAt: string;
  seller: CitizenProfile;
}

export interface CreateListingInput {
  type: ListingType;
  title: string;
  description: string;
  price: number;
  city?: string | null;
}

export const listingKeys = {
  // Listings embed a viewer-personalized seller projection (isSelf / canMessage /
  // isFollowing), so they must be scoped to the authenticated viewer too.
  typePrefix: (scope: CitizenViewerScope, type: ListingType) =>
    ["citizen", "v", scope, "listings", type] as const,
  list: (scope: CitizenViewerScope, type: ListingType, city?: string) =>
    ["citizen", "v", scope, "listings", type, city ?? ""] as const,
};

function listingQuery(type: ListingType, city?: string): string {
  const q = new URLSearchParams({ type });
  if (city) q.set("city", city);
  return `?${q.toString()}`;
}

export function useCitizenListings(type: ListingType, city?: string) {
  const { scope, ready } = useCitizenViewerScope();
  return useQuery({
    queryKey: listingKeys.list(scope, type, city),
    queryFn: () =>
      citizenFetch<{ listings: CitizenListing[] }>(`/api/citizen-listings${listingQuery(type, city)}`),
    enabled: ready,
  });
}

export function useCreateListing() {
  const qc = useQueryClient();
  const { scope } = useCitizenViewerScope();
  return useMutation({
    mutationFn: (data: CreateListingInput) =>
      citizenFetch<CitizenListing>("/api/citizen-listings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (listing) => {
      void qc.invalidateQueries({ queryKey: listingKeys.typePrefix(scope, listing.type) });
    },
  });
}

export function useDeleteListing() {
  const qc = useQueryClient();
  const { scope } = useCitizenViewerScope();
  return useMutation({
    mutationFn: ({ id }: { id: number; type: ListingType }) =>
      citizenFetch<{ success: true }>(`/api/citizen-listings/${id}`, { method: "DELETE" }),
    onSuccess: (_r, { type }) => {
      void qc.invalidateQueries({ queryKey: listingKeys.typePrefix(scope, type) });
    },
  });
}
