import { Schema } from "effect/index";
import { DateTimeUtcFromDate } from "effect/Schema";
import { credential } from "firebase-admin";
import { getApps, initializeApp } from "firebase-admin/app";
import { Timestamp } from "firebase-admin/firestore";

// Skip initialization if already initialized and hot-reloading problems
if (getApps().length === 0) {
  console.log("Initializing Firebase app...", process.env.PROJECT_ID);
  initializeApp({
    projectId: process.env.PROJECT_ID!,
    credential: credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") || "",
    }),
  });
}

/**
 * Uno schema che rappresenta un Timestamp di Firestore.
 * Valida che il valore in input sia un'istanza della classe Timestamp.
 */
const FirestoreTimestamp = Schema.instanceOf(Timestamp);

/**
 * Uno schema che trasforma un Timestamp di Firestore in un oggetto Date e viceversa.
 * - `decode`: Timestamp (input da Firestore) -> Date (output per la tua app)
 * - `encode`: Date (input dalla tua app) -> Timestamp (output per Firestore)
 */
export const FirestoreDate = Schema.transform(
  FirestoreTimestamp, // Lo schema di partenza (From)
  DateTimeUtcFromDate, // Lo schema di arrivo (To)
  {
    strict: true,
    decode: (timestamp) => timestamp.toDate(),
    encode: (date) => Timestamp.fromDate(date),
  }
);

export const FirebaseSchema = Schema.Struct({
  id: Schema.String,
  createTime: Schema.DateFromSelf,
  updateTime: Schema.DateFromSelf,
  readTime: Schema.DateFromSelf,
});

export async function getDataFromDoc<A, I = A, R = never>(
  documentRef: FirebaseFirestore.DocumentReference,
  schema: Schema.Schema<A, I, R>
): Promise<A> {
  const doc = await documentRef.get();
  const data = mapWithSchema(schema)(doc);
  return data;
}
export async function getDataFromQuery<A, I = A, R = never>(
  query: FirebaseFirestore.Query,
  schema: Schema.Schema<A, I, R>
) {
  const snapshot = await query.get();
  const data = snapshot.docs.map(mapWithSchema(schema));
  return data;
}

export function mapWithSchema<A, I = A, R = never>(
  schema: Schema.Schema<A, I, R>
) {
  return (doc: FirebaseFirestore.DocumentData): A => {
    const data = doc.data();

    if (!data) {
      throw new Error(`Document with id ${doc.id} has no data`);
    }

    const input = {
      id: doc.id,
      createTime: doc.createTime.toDate(),
      updateTime: doc.updateTime?.toDate(),
      readTime: doc.readTime.toDate(),
      ...data,
    };

    const result = Schema.decodeUnknownEither(
      schema as Schema.Schema<A, I, never>
    )(input);
    if (result._tag === "Left") {
      throw new Error(`Schema validation failed: ${result.left}`);
    }
    return result.right;
  };
}

export async function* getAsyncGeneratorFromQuery<A, I = A, R = never>(
  startQuery: FirebaseFirestore.Query,
  schema: Schema.Schema<A, I, R>,
  { limit = 10, maxCount = 1000 }: { limit?: number; maxCount?: number } = {}
): AsyncGenerator<A, void, void> {
  let count = 0;
  let data: A[] = [];
  let lastLoadedDoc:
    | FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
    | undefined;

  function getNextQuery(
    lastLoadedDoc?: FirebaseFirestore.QueryDocumentSnapshot<
      FirebaseFirestore.DocumentData,
      FirebaseFirestore.DocumentData
    >
  ) {
    let query = startQuery.limit(limit);

    if (lastLoadedDoc) {
      query = query.startAfter(lastLoadedDoc);
    }
    return query;
  }

  while (true) {
    console.log("######## Loading next batch...");
    const query = getNextQuery(lastLoadedDoc);
    const snapshot = await query.get();
    lastLoadedDoc = snapshot.docs[snapshot.docs.length - 1];
    data = snapshot.docs.map(mapWithSchema(schema));

    count += data.length;

    if (data.length === 0 || count >= maxCount) {
      break;
    }

    for (const user of data) {
      console.log(".  * Yielding user:");
      yield user;
    }
  }
}
