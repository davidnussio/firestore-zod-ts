import { Chunk, Schema, Stream } from "effect/index";
import { getAsyncGeneratorFromQuery } from "./firestore";

/**
 * Creates an Effect Stream from a Firestore query using the async generator.
 * This function wraps the getAsyncGeneratorFromQuery async generator in an Effect Stream,
 * providing better composability with the Effect ecosystem.
 *
 * @param startQuery - The initial Firestore query
 * @param schema - The Effect Schema to validate each document
 * @param options - Configuration options for pagination (limit, maxCount)
 * @returns A Stream that emits validated documents of type A
 */
export function getDataEffect<A, I = A, R = never>(
  startQuery: FirebaseFirestore.Query,
  schema: Schema.Schema<A, I, R>,
  options?: { limit?: number; maxCount?: number }
): Stream.Stream<A, Error, never> {
  const asyncIterable = getAsyncGeneratorFromQuery(startQuery, schema, options);

  return Stream.fromAsyncIterable(
    asyncIterable,
    (error) => new Error(`Stream error: ${String(error)}`)
  );
}

/**
 * Collects all data from a Firestore query using Effect Stream.
 * This is a convenience function that runs the stream and collects all results.
 *
 * @param startQuery - The initial Firestore query
 * @param schema - The Effect Schema to validate each document
 * @param options - Configuration options for pagination (limit, maxCount)
 * @returns An Effect that resolves to an array of validated documents
 */
export function collectDataEffect<A, I = A, R = never>(
  startQuery: FirebaseFirestore.Query,
  schema: Schema.Schema<A, I, R>,
  options?: { limit?: number; maxCount?: number }
): Stream.Stream<Chunk.Chunk<A>, Error, never> {
  return getDataEffect(startQuery, schema, options).pipe(
    Stream.runCollect,
    Stream.fromEffect
  );
}
