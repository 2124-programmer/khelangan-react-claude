/**
 * QueryState — the standard way to render a data query's four states.
 *
 *   isLoading  → <BallOrbitLoader />
 *   isError    → classify; 'auth' renders null (the auth layer handles routing), otherwise
 *                <ErrorState> with kind-aware copy + a Retry button calling query.refetch()
 *   isEmpty    → <EmptyState /> (opt in via the `isEmpty` predicate)
 *   success    → children(data)
 *
 * Use this for SCREEN/SECTION data. Pair it with `meta: { suppressToast: true }` on the query so a
 * failed load shows ONLY the inline state and never also fires the global toast (no double-report).
 * Toasts remain reserved for user-triggered ACTION failures (mutations).
 *
 * Typed against a structural `QueryLike` so it accepts both `useQuery` and `useInfiniteQuery` results
 * without leaking `any` into the signature.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import BallOrbitLoader from './BallOrbitLoader';
import { EmptyState, ErrorState } from './common';
import { classifyError } from '../lib/errors';
import { spacing } from '../theme';

/** Minimal shape shared by UseQueryResult and UseInfiniteQueryResult. */
export interface QueryLike<TData> {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data: TData | undefined;
  refetch: () => unknown;
}

interface EmptyCopy {
  icon?: string;
  title: string;
  subtitle?: string;
}

interface QueryStateProps<TData> {
  query: QueryLike<TData>;
  /** Render the success state. Receives the (defined) data. */
  children: (data: TData) => React.ReactNode;
  /** Return true when `data` is present but should render the empty state instead. */
  isEmpty?: (data: TData) => boolean;
  /** Copy (or a custom node) for the empty state. */
  empty?: EmptyCopy | React.ReactNode;
  /** Wrap loading/error/empty states in a centered flex container (for full-screen usage). */
  center?: boolean;
  /** Loader diameter. */
  loaderSize?: number;
  /** Style applied to the centering wrapper. */
  style?: ViewStyle;
}

function isEmptyCopy(value: EmptyCopy | React.ReactNode): value is EmptyCopy {
  return !!value && typeof value === 'object' && 'title' in (value as object);
}

export function QueryState<TData>({
  query, children, isEmpty, empty, center, loaderSize = 120, style,
}: QueryStateProps<TData>) {
  const wrap = (node: React.ReactNode) =>
    center ? <View style={[styles.center, style]}>{node}</View> : <>{node}</>;

  if (query.isLoading) {
    return wrap(<BallOrbitLoader size={loaderSize} />);
  }

  if (query.isError) {
    const kind = classifyError(query.error);
    // The auth layer (interceptor → session-expired flow) owns 401/403 routing; render nothing.
    if (kind === 'auth') return null;
    return wrap(<ErrorState kind={kind} onRetry={() => query.refetch()} />);
  }

  const { data } = query;
  if (data === undefined) return null;

  if (isEmpty?.(data)) {
    if (React.isValidElement(empty)) return wrap(empty);
    const copy = isEmptyCopy(empty) ? empty : { title: 'Nothing here yet' };
    return wrap(<EmptyState icon={copy.icon} title={copy.title} subtitle={copy.subtitle} />);
  }

  return <>{children(data)}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
});

export default QueryState;
